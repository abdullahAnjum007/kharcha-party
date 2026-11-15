import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { forbidden } from '../../lib/errors.js';
import type { Services } from '../routes.types.js';

const groupParamsSchema = z.object({ groupId: z.string().uuid() });
const voiceSchema = z.object({
  transcript: z.string().trim().min(2).max(500),
  splitAmongMemberIds: z.array(z.string().uuid()).min(1).max(50).optional(),
});

function assertTokenGroup(request: FastifyRequest, groupId: string) {
  if (request.user.groupId !== groupId) throw forbidden('Token kisi aur group ka hai.');
}

export async function registerVoiceRoutes(app: FastifyInstance, services: Services) {
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

// Future integration point: upload audio, call a speech-to-text provider, then pass its transcript to the service above.
