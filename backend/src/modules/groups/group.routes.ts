import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { forbidden } from '../../lib/errors.js';
import type { Services } from '../routes.types.js';

const createGroupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  creatorName: z.string().trim().min(1).max(40),
  memberNames: z.array(z.string().trim().min(1).max(40)).max(49).optional(),
});

const joinGroupSchema = z.object({
  groupCode: z.string().trim().min(5).max(16),
  inviteCode: z.string().regex(/^\d{4}$/, 'Invitation code exactly 4 digits ka hona chahiye.'),
});

const groupParamsSchema = z.object({ groupId: z.string().uuid() });
const memberParamsSchema = z.object({ groupId: z.string().uuid(), memberId: z.string().uuid() });
const addMembersSchema = z.object({ names: z.array(z.string().trim().min(1).max(40)).min(1).max(49) });
const voteSchema = z.object({ candidateId: z.string().uuid() });
const budgetSchema = z.object({
  mode: z.enum(['DECIDED', 'FLEXIBLE']),
  individualBudget: z.number().int().min(0).max(1_000_000_000),
});

function assertTokenGroup(request: FastifyRequest, groupId: string) {
  if (request.user.groupId !== groupId) throw forbidden('Token kisi aur group ka hai.');
}

export async function registerGroupRoutes(app: FastifyInstance, services: Services) {
  app.post('/api/v1/groups', async (request, reply) => {
    const input = createGroupSchema.parse(request.body);
    const result = services.groups.create(input);
    const token = app.jwt.sign({ memberId: result.member.id, groupId: result.group.id, name: result.member.name }, { expiresIn: '30d' });
    return reply.code(201).send({ data: { ...result, token } });
  });

  app.post('/api/v1/auth/invite', { config: { rateLimit: { max: 8, timeWindow: '1 minute' } } }, async (request, reply) => {
    const input = joinGroupSchema.parse(request.body);
    const result = services.groups.loginWithInviteCode(input.groupCode, input.inviteCode);
    const token = app.jwt.sign({ memberId: result.member.id, groupId: result.group.id, name: result.member.name }, { expiresIn: '30d' });
    return reply.send({ data: { ...result, token } });
  });

  app.post('/api/v1/groups/join', { config: { rateLimit: { max: 8, timeWindow: '1 minute' } } }, async (request, reply) => {
    const input = joinGroupSchema.parse(request.body);
    const result = services.groups.loginWithInviteCode(input.groupCode, input.inviteCode);
    const token = app.jwt.sign({ memberId: result.member.id, groupId: result.group.id, name: result.member.name }, { expiresIn: '30d' });
    return reply.send({ data: { ...result, token } });
  });

  app.get('/api/v1/groups/:groupId', { preHandler: app.authenticate }, async (request) => {
    const { groupId } = groupParamsSchema.parse(request.params);
    assertTokenGroup(request, groupId);
    return { data: services.groups.snapshot(groupId) };
  });

  app.post('/api/v1/groups/:groupId/members', { preHandler: app.authenticate }, async (request, reply) => {
    const { groupId } = groupParamsSchema.parse(request.params);
    assertTokenGroup(request, groupId);
    const { names } = addMembersSchema.parse(request.body);
    const members = services.groups.addMembers(groupId, request.user.memberId, names);
    return reply.code(201).send({ data: { members } });
  });

  app.post('/api/v1/groups/:groupId/members/:memberId/invite-code/reset', { preHandler: app.authenticate }, async (request) => {
    const { groupId, memberId } = memberParamsSchema.parse(request.params);
    assertTokenGroup(request, groupId);
    return { data: { member: services.groups.resetInviteCode(groupId, request.user.memberId, memberId) } };
  });

  app.post('/api/v1/groups/:groupId/votes', { preHandler: app.authenticate }, async (request) => {
    const { groupId } = groupParamsSchema.parse(request.params);
    assertTokenGroup(request, groupId);
    const { candidateId } = voteSchema.parse(request.body);
    return { data: services.groups.castVote(groupId, request.user.memberId, candidateId) };
  });

  app.put('/api/v1/groups/:groupId/budget', { preHandler: app.authenticate }, async (request) => {
    const { groupId } = groupParamsSchema.parse(request.params);
    assertTokenGroup(request, groupId);
    const input = budgetSchema.parse(request.body);
    return { data: { budget: services.groups.proposeBudget(groupId, request.user.memberId, input.mode, input.individualBudget) } };
  });

  app.post('/api/v1/groups/:groupId/budget/lock', { preHandler: app.authenticate }, async (request) => {
    const { groupId } = groupParamsSchema.parse(request.params);
    assertTokenGroup(request, groupId);
    return { data: { budget: services.groups.lockBudget(groupId, request.user.memberId) } };
  });
}
