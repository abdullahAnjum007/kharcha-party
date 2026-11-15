import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { forbidden } from '../../lib/errors.js';
import type { Services } from '../routes.types.js';

const groupParamsSchema = z.object({ groupId: z.string().uuid() });

function assertTokenGroup(request: FastifyRequest, groupId: string) {
  if (request.user.groupId !== groupId) throw forbidden('Token kisi aur group ka hai.');
}

export async function registerDashboardRoutes(app: FastifyInstance, services: Services) {
  app.get('/api/v1/groups/:groupId/dashboard', { preHandler: app.authenticate }, async (request) => {
    const { groupId } = groupParamsSchema.parse(request.params);
    assertTokenGroup(request, groupId);
    const snapshot = services.groups.snapshot(groupId);
    const spending = services.repository.getSpendingSummary(groupId);
    const recentExpenses = services.expenses.list(groupId).slice(0, 5);
    const settlement = services.settlements.calculate(groupId);
    const member = snapshot.members.find((item) => item.id === request.user.memberId)!;
    const accounting = services.repository.approvedAccounting(groupId);
    const approvedPaidByMember = accounting.paid.find((item) => item.member_id === member.id)?.amount ?? 0;

    return {
      data: {
        group: snapshot.group,
        currentMember: { ...member, role: snapshot.group.leaderId === member.id ? 'LEADER' : 'TRAVELLER' },
        spending: {
          approved: spending.approved,
          pending: spending.pending,
          groupBudget: snapshot.group.budget.groupAmount,
          remaining: Math.max(0, snapshot.group.budget.groupAmount - spending.approved),
          progressPercent: snapshot.group.budget.groupAmount > 0
            ? Math.min(100, Math.round((spending.approved / snapshot.group.budget.groupAmount) * 100))
            : 0,
          currentMemberPaid: approvedPaidByMember,
        },
        recentExpenses,
        settlement,
      },
    };
  });

  app.get('/api/v1/groups/:groupId/settlements', { preHandler: app.authenticate }, async (request) => {
    const { groupId } = groupParamsSchema.parse(request.params);
    assertTokenGroup(request, groupId);
    return { data: services.settlements.calculate(groupId) };
  });
}
