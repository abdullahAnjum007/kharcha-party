import Fastify, { type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { ZodError } from 'zod';
import { Database } from './db/database.js';
import { KharchaRepository } from './db/repository.js';
import { AppError } from './lib/errors.js';
import { EventHub } from './lib/event-hub.js';
import { registerDashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { registerExpenseRoutes } from './modules/expenses/expense.routes.js';
import { ExpenseService } from './modules/expenses/expense.service.js';
import { registerGroupRoutes } from './modules/groups/group.routes.js';
import { GroupService } from './modules/groups/group.service.js';
import { registerRealtimeRoutes } from './modules/realtime/realtime.routes.js';
import type { Services } from './modules/routes.types.js';
import { SettlementService } from './modules/settlements/settlement.service.js';
import { registerVoiceRoutes } from './modules/voice/voice.routes.js';

export type BuildAppOptions = {
  databasePath?: string;
  jwtSecret?: string;
  corsOrigin?: string;
  logger?: FastifyServerOptions['logger'];
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
  const services: Services = { repository, events, groups, expenses, settlements };

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

  app.decorate('authenticate', async function authenticate(request) {
    await request.jwtVerify();
  });

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
