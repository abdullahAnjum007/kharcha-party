import type { EventHub } from '../../lib/event-hub.js';
import { conflict, forbidden, notFound } from '../../lib/errors.js';
import { createId, nowIso } from '../../lib/id.js';
import type { KharchaRepository, VoiceDraftRow } from '../../db/repository.js';
import type { ExpenseService } from '../expenses/expense.service.js';
import type { GroupService } from '../groups/group.service.js';
import type { VoiceAI, VoiceAudio } from './voice-ai.js';

export class VoiceDraftService {
  constructor(
    private readonly repository: KharchaRepository,
    private readonly groups: GroupService,
    private readonly expenses: ExpenseService,
    private readonly events: EventHub,
    private readonly ai: VoiceAI,
  ) {}

  async create(groupId: string, memberId: string, audio: VoiceAudio) {
    this.groups.requireMemberInGroup(groupId, memberId);
    const parsed = await this.ai.transcribeAndExtract(audio);
    const timestamp = nowIso();
    const draft: VoiceDraftRow = {
      id: createId(),
      group_id: groupId,
      member_id: memberId,
      transcript: parsed.transcript,
      title: parsed.title,
      category: parsed.category,
      amount: parsed.amount,
      status: 'PENDING_REVIEW',
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
    const draft = this.requireOwnedDraft(groupId, memberId, draftId);
    if (draft.status !== 'PENDING_REVIEW') throw conflict('Yeh voice entry pehle hi review ho chuki hai.');
    const expense = this.expenses.create(groupId, memberId, {
      title: draft.title,
      category: draft.category,
      amount: draft.amount,
      paidByMemberId: memberId,
      source: 'VOICE',
    });
    const timestamp = nowIso();
    this.repository.setVoiceDraftStatus(draft.id, 'ACCEPTED', expense.id, timestamp);
    const updated = { ...draft, status: 'ACCEPTED' as const, expense_id: expense.id, updated_at: timestamp };
    this.events.publish({ type: 'voice_draft.accepted', groupId, occurredAt: timestamp, payload: { voiceDraftId: draft.id, expenseId: expense.id } });
    return { voiceDraft: this.map(updated), expense };
  }

  deny(groupId: string, memberId: string, draftId: string) {
    const draft = this.requireOwnedDraft(groupId, memberId, draftId);
    if (draft.status !== 'PENDING_REVIEW') throw conflict('Yeh voice entry pehle hi review ho chuki hai.');
    const timestamp = nowIso();
    this.repository.setVoiceDraftStatus(draft.id, 'DENIED', null, timestamp);
    const updated = { ...draft, status: 'DENIED' as const, updated_at: timestamp };
    this.events.publish({ type: 'voice_draft.denied', groupId, occurredAt: timestamp, payload: { voiceDraftId: draft.id } });
    return this.map(updated);
  }

  private requireOwnedDraft(groupId: string, memberId: string, draftId: string) {
    this.groups.requireMemberInGroup(groupId, memberId);
    const draft = this.repository.getVoiceDraft(draftId);
    if (!draft || draft.group_id !== groupId) throw notFound('Voice entry nahi mili.');
    if (draft.member_id !== memberId) throw forbidden('Sirf entry banane wala member isay review kar sakta hai.');
    return draft;
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
      status: draft.status,
      expenseId: draft.expense_id,
      createdAt: draft.created_at,
      updatedAt: draft.updated_at,
    };
  }
}
