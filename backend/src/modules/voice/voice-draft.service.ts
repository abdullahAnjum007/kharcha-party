import type { EventHub } from '../../lib/event-hub.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { createId, nowIso } from '../../lib/id.js';
import type { KharchaRepository, VoiceDraftRow } from '../../db/repository.js';
import type { ExpenseService } from '../expenses/expense.service.js';
import type { GroupService } from '../groups/group.service.js';
import type { VoiceAI, VoiceAudio } from './voice-ai.js';

export type UpdateVoiceDraftInput = {
  title?: string | null | undefined;
  category?: string | null | undefined;
  amount?: number | null | undefined;
  paidByMemberId?: string | null | undefined;
};

export class VoiceDraftService {
  constructor(
    private readonly repository: KharchaRepository,
    private readonly groups: GroupService,
    private readonly expenses: ExpenseService,
    private readonly events: EventHub,
    private readonly ai: VoiceAI,
  ) {}

  async create(groupId: string, memberId: string, audio: VoiceAudio) {
    const currentMember = this.groups.requireMemberInGroup(groupId, memberId);
    const members = this.repository.listMembers(groupId);
    const parsed = await this.ai.transcribeAndExtract(audio, {
      currentMemberName: currentMember.name,
      memberNames: members.map((member) => member.name),
    });
    const paidBy = parsed.paidByName
      ? members.find((member) => member.name.toLocaleLowerCase('en') === parsed.paidByName!.toLocaleLowerCase('en')) ?? null
      : null;
    const missingFields = this.missingFields(parsed.title, parsed.category, parsed.amount, paidBy?.id ?? null);
    const timestamp = nowIso();
    const draft: VoiceDraftRow = {
      id: createId(),
      group_id: groupId,
      member_id: memberId,
      transcript: parsed.transcript,
      title: parsed.title,
      category: parsed.category,
      amount: parsed.amount,
      paid_by_member_id: paidBy?.id ?? null,
      missing_fields: JSON.stringify(missingFields),
      status: missingFields.length ? 'NEEDS_DETAILS' : 'PENDING_REVIEW',
      expense_id: null,
      created_at: timestamp,
      updated_at: timestamp,
    };
    this.repository.insertVoiceDraft(draft);
    this.events.publish({ type: 'voice_draft.ready', groupId, occurredAt: timestamp, payload: { voiceDraftId: draft.id, memberId } });
    return this.map(draft);
  }

  list(groupId: string) {
    this.groups.requireGroup(groupId);
    return this.repository.listVoiceDrafts(groupId).map((draft) => this.map(draft));
  }

  accept(groupId: string, memberId: string, draftId: string) {
    const draft = this.requireEditableDraft(groupId, memberId, draftId);
    if (draft.status === 'NEEDS_DETAILS') throw conflict('Accept se pehle missing details complete karein.');
    if (draft.status !== 'PENDING_REVIEW') throw conflict('Yeh voice entry pehle hi review ho chuki hai.');
    if (!draft.title || !draft.category || !draft.amount || !draft.paid_by_member_id) throw conflict('Entry ki details incomplete hain.');
    const expense = this.expenses.create(groupId, memberId, {
      title: draft.title,
      category: draft.category,
      amount: draft.amount,
      paidByMemberId: draft.paid_by_member_id,
      source: 'VOICE',
    });
    const timestamp = nowIso();
    this.repository.setVoiceDraftStatus(draft.id, 'ACCEPTED', expense.id, timestamp);
    const updated = { ...draft, status: 'ACCEPTED' as const, expense_id: expense.id, updated_at: timestamp };
    this.events.publish({ type: 'voice_draft.accepted', groupId, occurredAt: timestamp, payload: { voiceDraftId: draft.id, expenseId: expense.id } });
    return { voiceDraft: this.map(updated), expense };
  }

  deny(groupId: string, memberId: string, draftId: string) {
    const draft = this.requireEditableDraft(groupId, memberId, draftId);
    if (!['PENDING_REVIEW', 'NEEDS_DETAILS'].includes(draft.status)) throw conflict('Yeh voice entry pehle hi review ho chuki hai.');
    const timestamp = nowIso();
    this.repository.setVoiceDraftStatus(draft.id, 'DENIED', null, timestamp);
    const updated = { ...draft, status: 'DENIED' as const, updated_at: timestamp };
    this.events.publish({ type: 'voice_draft.denied', groupId, occurredAt: timestamp, payload: { voiceDraftId: draft.id } });
    return this.map(updated);
  }

  update(groupId: string, memberId: string, draftId: string, input: UpdateVoiceDraftInput) {
    const draft = this.requireEditableDraft(groupId, memberId, draftId);
    if (!['PENDING_REVIEW', 'NEEDS_DETAILS'].includes(draft.status)) throw conflict('Accepted ya denied entry edit nahi ho sakti.');
    if (input.paidByMemberId) this.groups.requireMemberInGroup(groupId, input.paidByMemberId);
    const timestamp = nowIso();
    const updated: VoiceDraftRow = {
      ...draft,
      title: input.title !== undefined ? input.title?.trim() || null : draft.title,
      category: input.category !== undefined ? input.category?.trim() || null : draft.category,
      amount: input.amount !== undefined ? input.amount : draft.amount,
      paid_by_member_id: input.paidByMemberId !== undefined ? input.paidByMemberId : draft.paid_by_member_id,
      updated_at: timestamp,
    };
    const missingFields = this.missingFields(updated.title, updated.category, updated.amount, updated.paid_by_member_id);
    updated.missing_fields = JSON.stringify(missingFields);
    updated.status = missingFields.length ? 'NEEDS_DETAILS' : 'PENDING_REVIEW';
    this.repository.updateVoiceDraftDetails(updated);
    this.events.publish({ type: 'voice_draft.updated', groupId, occurredAt: timestamp, payload: { voiceDraftId: draft.id, missingFields } });
    return this.map(updated);
  }

  private requireEditableDraft(groupId: string, memberId: string, draftId: string) {
    this.groups.requireMemberInGroup(groupId, memberId);
    const draft = this.repository.getVoiceDraft(draftId);
    if (!draft || draft.group_id !== groupId) throw notFound('Voice entry nahi mili.');
    const group = this.groups.requireGroup(groupId);
    if (draft.member_id !== memberId && group.leader_id !== memberId) throw forbidden('Sirf entry banane wala member ya leader isay edit kar sakta hai.');
    return draft;
  }

  private missingFields(title: string | null, category: string | null, amount: number | null, paidByMemberId: string | null) {
    const fields: string[] = [];
    if (!title) fields.push('title');
    if (!category) fields.push('category');
    if (!amount) fields.push('amount');
    if (!paidByMemberId) fields.push('paidBy');
    return fields;
  }

  private map(draft: VoiceDraftRow) {
    return {
      id: draft.id,
      groupId: draft.group_id,
      memberId: draft.member_id,
      memberName: this.repository.getMember(draft.member_id)?.name ?? 'Unknown',
      transcript: draft.transcript,
      title: draft.title,
      category: draft.category,
      amount: draft.amount,
      paidBy: draft.paid_by_member_id ? {
        id: draft.paid_by_member_id,
        name: this.repository.getMember(draft.paid_by_member_id)?.name ?? 'Unknown',
      } : null,
      missingFields: this.parseMissingFields(draft.missing_fields),
      status: draft.status,
      expenseId: draft.expense_id,
      createdAt: draft.created_at,
      updatedAt: draft.updated_at,
    };
  }

  private parseMissingFields(value: string) {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
    } catch {
      throw badRequest('Voice draft details read nahi ho sakin.');
    }
  }
}
