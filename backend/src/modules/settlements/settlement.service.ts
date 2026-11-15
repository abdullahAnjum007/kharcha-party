import type { KharchaRepository } from '../../db/repository.js';
import type { GroupService } from '../groups/group.service.js';

export class SettlementService {
  constructor(
    private readonly repository: KharchaRepository,
    private readonly groups: GroupService,
  ) {}

  calculate(groupId: string) {
    this.groups.requireGroup(groupId);
    const members = this.repository.listMembers(groupId);
    const { paid, owed } = this.repository.approvedAccounting(groupId);
    const paidByMember = new Map(paid.map((item) => [item.member_id, item.amount]));
    const owedByMember = new Map(owed.map((item) => [item.member_id, item.amount]));

    const balances = members.map((member) => ({
      memberId: member.id,
      name: member.name,
      paid: paidByMember.get(member.id) ?? 0,
      share: owedByMember.get(member.id) ?? 0,
      balance: (paidByMember.get(member.id) ?? 0) - (owedByMember.get(member.id) ?? 0),
    }));

    const creditors = balances.filter((item) => item.balance > 0).map((item) => ({ ...item, remaining: item.balance })).sort((a, b) => b.remaining - a.remaining);
    const debtors = balances.filter((item) => item.balance < 0).map((item) => ({ ...item, remaining: -item.balance })).sort((a, b) => b.remaining - a.remaining);
    const payments: Array<{ fromMemberId: string; fromName: string; toMemberId: string; toName: string; amount: number }> = [];

    let debtorIndex = 0;
    let creditorIndex = 0;
    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex]!;
      const creditor = creditors[creditorIndex]!;
      const amount = Math.min(debtor.remaining, creditor.remaining);
      if (amount > 0) {
        payments.push({ fromMemberId: debtor.memberId, fromName: debtor.name, toMemberId: creditor.memberId, toName: creditor.name, amount });
      }
      debtor.remaining -= amount;
      creditor.remaining -= amount;
      if (debtor.remaining === 0) debtorIndex += 1;
      if (creditor.remaining === 0) creditorIndex += 1;
    }

    return { summary: `${payments.length} payments and sab chill ✌️`, balances, payments };
  }
}
