import type { EventHub } from '../../lib/event-hub.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { createId, nowIso } from '../../lib/id.js';
import type { ExpenseRow, KharchaRepository, VoiceLogRow } from '../../db/repository.js';
import type { GroupService } from '../groups/group.service.js';

export type CreateExpenseInput = {
  title: string;
  category: string;
  amount: number;
  paidByMemberId?: string | undefined;
  splitAmongMemberIds?: string[] | undefined;
  source?: 'MANUAL' | 'VOICE' | undefined;
};

export class ExpenseService {
  constructor(
    private readonly repository: KharchaRepository,
    private readonly groups: GroupService,
    private readonly events: EventHub,
  ) {}

  create(groupId: string, creatorId: string, input: CreateExpenseInput) {
    const expense = this.repository.transaction(() => this.createRecord(groupId, creatorId, input));
    this.events.publish({ type: 'expense.created', groupId, occurredAt: expense.created_at, payload: { expense: this.mapExpense(expense) } });
    return this.mapExpenseWithSplits(expense);
  }

  list(groupId: string, status?: ExpenseRow['status']) {
    this.groups.requireGroup(groupId);
    return this.repository.listExpenses(groupId, status).map((expense) => this.mapExpenseWithSplits(expense));
  }

  setStatus(groupId: string, leaderId: string, expenseId: string, status: 'APPROVED' | 'REJECTED') {
    const group = this.groups.requireGroup(groupId);
    if (group.leader_id !== leaderId) throw forbidden('Sirf leader expense approve ya reject kar sakta hai.');
    const expense = this.repository.getExpense(expenseId);
    if (!expense || expense.group_id !== groupId) throw notFound('Expense nahi mila.');

    const timestamp = nowIso();
    this.repository.setExpenseStatus(expenseId, status, timestamp);
    const updated: ExpenseRow = { ...expense, status, updated_at: timestamp };
    this.events.publish({ type: 'expense.status_changed', groupId, occurredAt: timestamp, payload: { expenseId, status, changedBy: leaderId } });
    return this.mapExpenseWithSplits(updated);
  }

  addVoiceTranscript(groupId: string, memberId: string, transcript: string, splitAmongMemberIds?: string[]) {
    this.groups.requireMemberInGroup(groupId, memberId);
    const parsed = this.parseTranscript(transcript);
    const timestamp = nowIso();
    let expense: ExpenseRow | null = null;

    const log = this.repository.transaction(() => {
      if (parsed) {
        expense = this.createRecord(groupId, memberId, {
          title: parsed.title,
          category: parsed.category,
          amount: parsed.amount,
          paidByMemberId: memberId,
          splitAmongMemberIds,
          source: 'VOICE',
        });
      }

      const voiceLog: VoiceLogRow = {
        id: createId(),
        group_id: groupId,
        member_id: memberId,
        transcript: transcript.trim(),
        status: parsed ? 'ACCEPTED' : 'PENDING',
        expense_id: expense?.id ?? null,
        created_at: timestamp,
      };
      this.repository.insertVoiceLog(voiceLog);
      return voiceLog;
    });

    this.events.publish({ type: 'voice_log.created', groupId, occurredAt: timestamp, payload: { voiceLogId: log.id, status: log.status, expenseId: log.expense_id } });
    return { voiceLog: this.mapVoiceLog(log), expense: expense ? this.mapExpenseWithSplits(expense) : null };
  }

  listVoiceLogs(groupId: string) {
    this.groups.requireGroup(groupId);
    return this.repository.listVoiceLogs(groupId).map((log) => this.mapVoiceLog(log));
  }

  private createRecord(groupId: string, creatorId: string, input: CreateExpenseInput): ExpenseRow {
    const group = this.groups.requireGroup(groupId);
    this.groups.requireMemberInGroup(groupId, creatorId);
    const payerId = input.paidByMemberId ?? creatorId;
    this.groups.requireMemberInGroup(groupId, payerId);
    if (payerId !== creatorId && group.leader_id !== creatorId) throw forbidden('Traveller sirf apna paid expense submit kar sakta hai.');

    const allMembers = this.repository.listMembers(groupId);
    const splitIds = [...new Set(input.splitAmongMemberIds?.length ? input.splitAmongMemberIds : allMembers.map((member) => member.id))];
    if (splitIds.length === 0) throw badRequest('Expense kam az kam ek member ke saath split hona chahiye.');
    for (const memberId of splitIds) this.groups.requireMemberInGroup(groupId, memberId);

    const baseShare = Math.floor(input.amount / splitIds.length);
    let remainder = input.amount % splitIds.length;
    const splits = splitIds.map((memberId) => ({
      memberId,
      shareAmount: baseShare + (remainder-- > 0 ? 1 : 0),
    }));
    const timestamp = nowIso();
    const expense: ExpenseRow = {
      id: createId(),
      group_id: groupId,
      title: input.title.trim(),
      category: input.category.trim(),
      amount: input.amount,
      paid_by_member_id: payerId,
      created_by_member_id: creatorId,
      status: group.leader_id === creatorId ? 'APPROVED' : 'PENDING',
      source: input.source ?? 'MANUAL',
      created_at: timestamp,
      updated_at: timestamp,
    };
    this.repository.insertExpense(expense, splits);
    return expense;
  }

  private mapExpense(expense: ExpenseRow) {
    const paidBy = this.repository.getMember(expense.paid_by_member_id);
    const createdBy = this.repository.getMember(expense.created_by_member_id);
    return {
      id: expense.id,
      groupId: expense.group_id,
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      paidBy: paidBy ? { id: paidBy.id, name: paidBy.name } : null,
      createdBy: createdBy ? { id: createdBy.id, name: createdBy.name } : null,
      status: expense.status,
      source: expense.source,
      createdAt: expense.created_at,
      updatedAt: expense.updated_at,
    };
  }

  private mapExpenseWithSplits(expense: ExpenseRow) {
    return {
      ...this.mapExpense(expense),
      splits: this.repository.getExpenseSplits(expense.id).map((split) => ({
        memberId: split.member_id,
        memberName: this.repository.getMember(split.member_id)?.name ?? 'Unknown',
        amount: split.share_amount,
      })),
    };
  }

  private mapVoiceLog(log: VoiceLogRow) {
    return {
      id: log.id,
      groupId: log.group_id,
      memberId: log.member_id,
      memberName: this.repository.getMember(log.member_id)?.name ?? 'Unknown',
      transcript: log.transcript,
      status: log.status,
      expenseId: log.expense_id,
      createdAt: log.created_at,
    };
  }

  private parseTranscript(transcript: string) {
    const amountMatch = transcript.match(/(?:rs\.?\s*)?(\d[\d,]*)/i);
    if (!amountMatch?.[1]) return null;
    const amount = Number(amountMatch[1].replaceAll(',', ''));
    if (!Number.isSafeInteger(amount) || amount <= 0) return null;

    const lower = transcript.toLocaleLowerCase('en');
    const category = lower.includes('hotel') ? 'Hotel'
      : lower.includes('fuel') || lower.includes('petrol') || lower.includes('transport') ? 'Transport'
        : lower.includes('dinner') || lower.includes('lunch') || lower.includes('food') ? 'Food'
          : 'Extra';
    return { amount, category, title: `${category} via voice` };
  }
}
