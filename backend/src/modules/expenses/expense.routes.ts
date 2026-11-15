import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { forbidden } from '../../lib/errors.js';
import type { Services } from '../routes.types.js';

const groupParamsSchema = z.object({ groupId: z.string().uuid() });
const expenseParamsSchema = z.object({ groupId: z.string().uuid(), expenseId: z.string().uuid() });
const createExpenseSchema = z.object({
  title: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(40),
  amount: z.number().int().min(1).max(1_000_000_000),
  paidByMemberId: z.string().uuid().optional(),
  splitAmongMemberIds: z.array(z.string().uuid()).min(1).max(50).optional(),
});
const statusSchema = z.object({ status: z.enum(['APPROVED', 'REJECTED']) });
const expenseQuerySchema = z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional() });

function assertTokenGroup(request: FastifyRequest, groupId: string) {
  if (request.user.groupId !== groupId) throw forbidden('Token kisi aur group ka hai.');
}

export async function registerExpenseRoutes(app: FastifyInstance, services: Services) {
  app.get('/api/v1/groups/:groupId/expenses', { preHandler: app.authenticate }, async (request) => {
    const { groupId } = groupParamsSchema.parse(request.params);
    assertTokenGroup(request, groupId);
    const { status } = expenseQuerySchema.parse(request.query);
    return { data: { expenses: services.expenses.list(groupId, status) } };
  });

  app.post('/api/v1/groups/:groupId/expenses', { preHandler: app.authenticate }, async (request, reply) => {
    const { groupId } = groupParamsSchema.parse(request.params);
    assertTokenGroup(request, groupId);
    const input = createExpenseSchema.parse(request.body);
    const expense = services.expenses.create(groupId, request.user.memberId, input);
    return reply.code(201).send({ data: { expense } });
  });

  app.patch('/api/v1/groups/:groupId/expenses/:expenseId/status', { preHandler: app.authenticate }, async (request) => {
    const { groupId, expenseId } = expenseParamsSchema.parse(request.params);
    assertTokenGroup(request, groupId);
    const { status } = statusSchema.parse(request.body);
    return { data: { expense: services.expenses.setStatus(groupId, request.user.memberId, expenseId, status) } };
  });
}
