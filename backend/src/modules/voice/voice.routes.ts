import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AppError, forbidden } from '../../lib/errors.js';
import type { Services } from '../routes.types.js';

const groupParamsSchema = z.object({ groupId: z.string().uuid() });
const draftParamsSchema = groupParamsSchema.extend({ draftId: z.string().uuid() });
const voiceSchema = z.object({
  transcript: z.string().trim().min(2).max(500),
  splitAmongMemberIds: z.array(z.string().uuid()).min(1).max(50).optional(),
});

function assertTokenGroup(request: FastifyRequest, groupId: string) {
  if (request.user.groupId !== groupId) throw forbidden('Token kisi aur group ka hai.');
}

export async function registerVoiceRoutes(app: FastifyInstance, services: Services) {
  app.get('/api/v1/groups/:groupId/voice-drafts', { preHandler: app.authenticate }, async (request) => {
    const { groupId } = groupParamsSchema.parse(request.params);
    assertTokenGroup(request, groupId);
    return { data: { voiceDrafts: services.voiceDrafts.list(groupId) } };
  });

  app.post('/api/v1/groups/:groupId/voice-drafts', { preHandler: app.authenticate }, async (request, reply) => {
    const { groupId } = groupParamsSchema.parse(request.params);
    assertTokenGroup(request, groupId);
    const file = await request.file();
    if (!file) throw new AppError(400, 'AUDIO_REQUIRED', 'Audio file required hai.');
    if (!file.mimetype.startsWith('audio/')) throw new AppError(415, 'INVALID_AUDIO_TYPE', 'Sirf audio file upload karein.');
    const voiceDraft = await services.voiceDrafts.create(groupId, request.user.memberId, {
      buffer: await file.toBuffer(),
      filename: file.filename || 'expense.m4a',
      mimeType: file.mimetype,
    });
    return reply.code(201).send({ data: { voiceDraft } });
  });

  app.post('/api/v1/groups/:groupId/voice-drafts/:draftId/accept', { preHandler: app.authenticate }, async (request) => {
    const { groupId, draftId } = draftParamsSchema.parse(request.params);
    assertTokenGroup(request, groupId);
    return { data: services.voiceDrafts.accept(groupId, request.user.memberId, draftId) };
  });

  app.post('/api/v1/groups/:groupId/voice-drafts/:draftId/deny', { preHandler: app.authenticate }, async (request) => {
    const { groupId, draftId } = draftParamsSchema.parse(request.params);
    assertTokenGroup(request, groupId);
    return { data: { voiceDraft: services.voiceDrafts.deny(groupId, request.user.memberId, draftId) } };
  });

  app.get('/api/v1/groups/:groupId/voice-logs', { preHandler: app.authenticate }, async (request) => {
    const { groupId } = groupParamsSchema.parse(request.params);
    assertTokenGroup(request, groupId);
    return { data: { voiceLogs: services.expenses.listVoiceLogs(groupId) } };
  });

  app.post('/api/v1/groups/:groupId/voice-logs', { preHandler: app.authenticate }, async (request, reply) => {
    const { groupId } = groupParamsSchema.parse(request.params);
    assertTokenGroup(request, groupId);
    const { transcript, splitAmongMemberIds } = voiceSchema.parse(request.body);
    const result = services.expenses.addVoiceTranscript(groupId, request.user.memberId, transcript, splitAmongMemberIds);
    return reply.code(201).send({ data: result });
  });
}
