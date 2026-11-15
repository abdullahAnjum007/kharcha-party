import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Services } from '../routes.types.js';

const paramsSchema = z.object({ groupId: z.string().uuid() });
const querySchema = z.object({ token: z.string().min(20) });

export async function registerRealtimeRoutes(app: FastifyInstance, services: Services) {
  app.get('/api/v1/groups/:groupId/events', { websocket: true }, (socket, request) => {
    try {
      const { groupId } = paramsSchema.parse(request.params);
      const { token } = querySchema.parse(request.query);
      const user = app.jwt.verify<{ memberId: string; groupId: string; name: string }>(token);
      if (user.groupId !== groupId) {
        socket.close(1008, 'Token belongs to another group');
        return;
      }
      services.groups.requireMemberInGroup(groupId, user.memberId);
      services.events.subscribe(groupId, socket);
      socket.send(JSON.stringify({ type: 'connected', groupId, occurredAt: new Date().toISOString(), payload: { memberId: user.memberId } }));
      socket.on('message', (message) => {
        // WebSocket RawData implements a meaningful UTF-8 toString conversion.
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        if (message.toString() === 'ping') socket.send(JSON.stringify({ type: 'pong', occurredAt: new Date().toISOString() }));
      });
    } catch {
      socket.close(1008, 'Invalid token or group');
    }
  });
}
