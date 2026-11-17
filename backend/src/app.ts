import Fastify, { type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import multipart from '@fastify/multipart';
import { ZodError } from 'zod';
import { Database } from './db/database.js';
import { KharchaRepository } from './db/repository.js';
import { AppError } from './lib/errors.js';
import { EventHub } from './lib/event-hub.js';
import { sanitizeForLog, sanitizeResponsePayload } from './lib/safe-log.js';
import { registerDashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { registerExpenseRoutes } from './modules/expenses/expense.routes.js';
import { ExpenseService } from './modules/expenses/expense.service.js';
import { registerGroupRoutes } from './modules/groups/group.routes.js';
import { GroupService } from './modules/groups/group.service.js';
import { registerRealtimeRoutes } from './modules/realtime/realtime.routes.js';
import type { Services } from './modules/routes.types.js';
import { SettlementService } from './modules/settlements/settlement.service.js';
import { registerVoiceRoutes } from './modules/voice/voice.routes.js';
import { VoiceDraftService } from './modules/voice/voice-draft.service.js';
import { OpenAIVoiceAI, UnavailableVoiceAI, type VoiceAI } from './modules/voice/voice-ai.js';

export type BuildAppOptions = {
  databasePath?: string;
  jwtSecret?: string;
  corsOrigin?: string;
  logger?: FastifyServerOptions['logger'];
  openAIApiKey?: string;
  transcriptionModel?: string;
  parserModel?: string;
  maxVoiceFileBytes?: number;
  voiceAI?: VoiceAI;
  logApiPayloads?: boolean;
};

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? false,
    trustProxy: true,
    bodyLimit: 1_000_000,
  });
  const database = new Database(options.databasePath ?? './data/kharcha-party.db');
  const repository = new KharchaRepository(database);
  const events = new EventHub();
  const tokenSecret = options.jwtSecret ?? 'development-only-secret-change-me-now';
  const groups = new GroupService(repository, events, tokenSecret);
  const expenses = new ExpenseService(repository, groups, events);
  const settlements = new SettlementService(repository, groups);
  const voiceAI = options.voiceAI ?? (options.openAIApiKey
    ? new OpenAIVoiceAI({
      apiKey: options.openAIApiKey,
      transcriptionModel: options.transcriptionModel ?? 'gpt-transcribe',
      parserModel: options.parserModel ?? 'gpt-6-luna',
      logPayloads: options.logApiPayloads ?? false,
    })
    : new UnavailableVoiceAI());
  const voiceDrafts = new VoiceDraftService(repository, groups, expenses, events, voiceAI);
  const services: Services = { repository, events, groups, expenses, settlements, voiceDrafts };

  await app.register(cors, {
    origin: options.corsOrigin === '*' || !options.corsOrigin
      ? true
      : options.corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });
  await app.register(jwt, { secret: tokenSecret });
  await app.register(websocket, { options: { maxPayload: 64 * 1024 } });
  await app.register(multipart, {
    limits: { files: 1, fileSize: options.maxVoiceFileBytes ?? 10_000_000, fields: 2 },
  });

  app.decorate('authenticate', async function authenticate(request) {
    await request.jwtVerify();
  });

  if (options.logApiPayloads) {
    app.addHook('preHandler', async (request) => {
      if (!request.url.startsWith('/api/')) return;
      request.log.info({
        requestId: request.id,
        method: request.method,
        url: request.url,
        params: sanitizeForLog(request.params),
        query: sanitizeForLog(request.query),
        payload: request.isMultipart() ? '[multipart audio; metadata logged by voice route]' : sanitizeForLog(request.body),
      }, 'API request payload');
    });

    app.addHook('onSend', async (request, reply, payload) => {
      if (request.url.startsWith('/api/')) {
        request.log.info({
          requestId: request.id,
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          response: sanitizeResponsePayload(payload),
        }, 'API response payload');
      }
      return payload;
    });
  }

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request data valid nahi hai.',
          details: error.flatten(),
          requestId: request.id,
        },
      });
    }
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message, details: error.details, requestId: request.id },
      });
    }
    const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
      ? (error as { statusCode?: unknown }).statusCode
      : undefined;
    if (statusCode === 401) {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Valid member token required hai.', requestId: request.id } });
    }
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
      const message = typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
        ? error.message
        : 'Request process nahi ho saki.';
      return reply.code(statusCode).send({
        error: { code: 'REQUEST_ERROR', message, requestId: request.id },
      });
    }
    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Server se scene off ho gaya. Dobara try karein.', requestId: request.id } });
  });

  app.get('/health', async () => ({ status: 'ok', service: 'kharcha-party-backend', timestamp: new Date().toISOString() }));
  app.get('/api/v1', async () => ({
    name: 'kharcha.party API',
    version: '1.0.0',
    docs: '/README.md',
    endpoints: {
      createGroup: 'POST /api/v1/groups',
      invitationLogin: 'POST /api/v1/auth/invite',
      dashboard: 'GET /api/v1/groups/:groupId/dashboard',
      expenses: '/api/v1/groups/:groupId/expenses',
      voiceLogs: '/api/v1/groups/:groupId/voice-logs',
      voiceDrafts: '/api/v1/groups/:groupId/voice-drafts',
      settlements: 'GET /api/v1/groups/:groupId/settlements',
      realtime: 'WS /api/v1/groups/:groupId/events?token=...',
    },
  }));

  await registerRealtimeRoutes(app, services);
  await registerGroupRoutes(app, services);
  await registerExpenseRoutes(app, services);
  await registerVoiceRoutes(app, services);
  await registerDashboardRoutes(app, services);

  app.addHook('onClose', async () => {
    events.closeAll();
    database.close();
  });

  return app;
}
