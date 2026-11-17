import type { Database } from './database.js';

export type GroupRow = {
  id: string;
  name: string;
  code: string;
  status: 'ACTIVE' | 'SETTLED';
  leader_id: string | null;
  voting_round: number;
  budget_mode: 'UNDECIDED' | 'DECIDED' | 'FLEXIBLE';
  budget_status: 'UNSET' | 'PROPOSED' | 'LOCKED';
  individual_budget: number;
  created_at: string;
  updated_at: string;
};

export type MemberRow = {
  id: string;
  group_id: string;
  name: string;
  invite_code_hash: string | null;
  session_active: 0 | 1;
  joined_at: string | null;
  created_at: string;
};

export type ExpenseRow = {
  id: string;
  group_id: string;
  title: string;
  category: string;
  amount: number;
  paid_by_member_id: string;
  created_by_member_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  source: 'MANUAL' | 'VOICE';
  created_at: string;
  updated_at: string;
};

export type VoiceLogRow = {
  id: string;
  group_id: string;
  member_id: string;
  transcript: string;
  status: 'PENDING' | 'ACCEPTED';
  expense_id: string | null;
  created_at: string;
};

export type VoiceDraftRow = {
  id: string;
  group_id: string;
  member_id: string;
  transcript: string;
  title: string | null;
  category: string | null;
  amount: number | null;
  paid_by_member_id: string | null;
  missing_fields: string;
  status: 'PENDING_REVIEW' | 'NEEDS_DETAILS' | 'ACCEPTED' | 'DENIED';
  expense_id: string | null;
  created_at: string;
  updated_at: string;
};

export class KharchaRepository {
  constructor(private readonly database: Database) {}

  transaction<T>(work: () => T): T {
    return this.database.transaction(work);
  }

  insertGroup(group: GroupRow) {
    this.database.raw.prepare(`
      INSERT INTO groups (
        id, name, code, status, leader_id, voting_round, budget_mode,
        budget_status, individual_budget, created_at, updated_at
      ) VALUES (
        @id, @name, @code, @status, @leader_id, @voting_round, @budget_mode,
        @budget_status, @individual_budget, @created_at, @updated_at
      )
    `).run(group);
  }

  insertMember(member: MemberRow) {
    this.database.raw.prepare(`
      INSERT INTO members (id, group_id, name, invite_code_hash, session_active, joined_at, created_at)
      VALUES (@id, @group_id, @name, @invite_code_hash, @session_active, @joined_at, @created_at)
    `).run(member);
  }

  getGroup(id: string): GroupRow | undefined {
    return this.database.raw.prepare('SELECT * FROM groups WHERE id = ?').get(id) as GroupRow | undefined;
  }

  getGroupByCode(code: string): GroupRow | undefined {
    return this.database.raw.prepare('SELECT * FROM groups WHERE code = ? COLLATE NOCASE').get(code) as GroupRow | undefined;
  }

  groupCodeExists(code: string): boolean {
    return Boolean(this.database.raw.prepare('SELECT 1 FROM groups WHERE code = ?').get(code));
  }

  listMembers(groupId: string): MemberRow[] {
    return this.database.raw.prepare('SELECT * FROM members WHERE group_id = ? ORDER BY created_at ASC').all(groupId) as MemberRow[];
  }

  getMember(id: string): MemberRow | undefined {
    return this.database.raw.prepare('SELECT * FROM members WHERE id = ?').get(id) as MemberRow | undefined;
  }

  getMemberByName(groupId: string, name: string): MemberRow | undefined {
    return this.database.raw.prepare('SELECT * FROM members WHERE group_id = ? AND name = ? COLLATE NOCASE').get(groupId, name) as MemberRow | undefined;
  }

  getMemberByInviteCodeHash(groupId: string, inviteCodeHash: string): MemberRow | undefined {
    return this.database.raw.prepare('SELECT * FROM members WHERE group_id = ? AND invite_code_hash = ?').get(groupId, inviteCodeHash) as MemberRow | undefined;
  }

  inviteCodeHashExists(groupId: string, inviteCodeHash: string): boolean {
    return Boolean(this.database.raw.prepare('SELECT 1 FROM members WHERE group_id = ? AND invite_code_hash = ?').get(groupId, inviteCodeHash));
  }

  updateInviteCodeHash(memberId: string, inviteCodeHash: string) {
    this.database.raw.prepare('UPDATE members SET invite_code_hash = ? WHERE id = ?').run(inviteCodeHash, memberId);
  }

  activateMember(id: string, joinedAt: string) {
    this.database.raw.prepare('UPDATE members SET session_active = 1, joined_at = ? WHERE id = ?').run(joinedAt, id);
  }

  castVote(groupId: string, round: number, voterId: string, candidateId: string, createdAt: string) {
    this.database.raw.prepare(`
      INSERT INTO votes (group_id, round, voter_id, candidate_id, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(group_id, round, voter_id)
      DO UPDATE SET candidate_id = excluded.candidate_id, created_at = excluded.created_at
    `).run(groupId, round, voterId, candidateId, createdAt);
  }

  getVoteCounts(groupId: string, round: number): Array<{ candidate_id: string; votes: number }> {
    return this.database.raw.prepare(`
      SELECT candidate_id, COUNT(*) AS votes
      FROM votes WHERE group_id = ? AND round = ?
      GROUP BY candidate_id ORDER BY votes DESC, candidate_id ASC
    `).all(groupId, round) as Array<{ candidate_id: string; votes: number }>;
  }

  countVotes(groupId: string, round: number): number {
    const row = this.database.raw.prepare('SELECT COUNT(*) AS count FROM votes WHERE group_id = ? AND round = ?').get(groupId, round) as { count: number };
    return row.count;
  }

  countActiveMembers(groupId: string): number {
    const row = this.database.raw.prepare('SELECT COUNT(*) AS count FROM members WHERE group_id = ? AND session_active = 1').get(groupId) as { count: number };
    return row.count;
  }

  setLeader(groupId: string, leaderId: string, updatedAt: string) {
    this.database.raw.prepare('UPDATE groups SET leader_id = ?, updated_at = ? WHERE id = ?').run(leaderId, updatedAt, groupId);
  }

  advanceVotingRound(groupId: string, updatedAt: string) {
    this.database.raw.prepare('UPDATE groups SET voting_round = voting_round + 1, updated_at = ? WHERE id = ?').run(updatedAt, groupId);
  }

  proposeBudget(groupId: string, mode: 'DECIDED' | 'FLEXIBLE', individualBudget: number, updatedAt: string) {
    this.database.raw.prepare(`
      UPDATE groups
      SET budget_mode = ?, budget_status = 'PROPOSED', individual_budget = ?, updated_at = ?
      WHERE id = ?
    `).run(mode, individualBudget, updatedAt, groupId);
  }

  lockBudget(groupId: string, updatedAt: string) {
    this.database.raw.prepare(`
      UPDATE groups SET budget_status = 'LOCKED', updated_at = ?
      WHERE id = ? AND budget_status = 'PROPOSED'
    `).run(updatedAt, groupId);
  }

  insertExpense(expense: ExpenseRow, splits: Array<{ memberId: string; shareAmount: number }>) {
    this.database.raw.prepare(`
      INSERT INTO expenses (
        id, group_id, title, category, amount, paid_by_member_id,
        created_by_member_id, status, source, created_at, updated_at
      ) VALUES (
        @id, @group_id, @title, @category, @amount, @paid_by_member_id,
        @created_by_member_id, @status, @source, @created_at, @updated_at
      )
    `).run(expense);

    const insertSplit = this.database.raw.prepare(`
      INSERT INTO expense_splits (expense_id, member_id, share_amount) VALUES (?, ?, ?)
    `);
    for (const split of splits) insertSplit.run(expense.id, split.memberId, split.shareAmount);
  }

  getExpense(id: string): ExpenseRow | undefined {
    return this.database.raw.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as ExpenseRow | undefined;
  }

  listExpenses(groupId: string, status?: ExpenseRow['status']): ExpenseRow[] {
    if (status) {
      return this.database.raw.prepare('SELECT * FROM expenses WHERE group_id = ? AND status = ? ORDER BY created_at DESC').all(groupId, status) as ExpenseRow[];
    }
    return this.database.raw.prepare('SELECT * FROM expenses WHERE group_id = ? ORDER BY created_at DESC').all(groupId) as ExpenseRow[];
  }

  getExpenseSplits(expenseId: string): Array<{ member_id: string; share_amount: number }> {
    return this.database.raw.prepare('SELECT member_id, share_amount FROM expense_splits WHERE expense_id = ?').all(expenseId) as Array<{ member_id: string; share_amount: number }>;
  }

  setExpenseStatus(id: string, status: ExpenseRow['status'], updatedAt: string) {
    this.database.raw.prepare('UPDATE expenses SET status = ?, updated_at = ? WHERE id = ?').run(status, updatedAt, id);
  }

  insertVoiceLog(log: VoiceLogRow) {
    this.database.raw.prepare(`
      INSERT INTO voice_logs (id, group_id, member_id, transcript, status, expense_id, created_at)
      VALUES (@id, @group_id, @member_id, @transcript, @status, @expense_id, @created_at)
    `).run(log);
  }

  listVoiceLogs(groupId: string): VoiceLogRow[] {
    return this.database.raw.prepare('SELECT * FROM voice_logs WHERE group_id = ? ORDER BY created_at DESC').all(groupId) as VoiceLogRow[];
  }

  insertVoiceDraft(draft: VoiceDraftRow) {
    this.database.raw.prepare(`
      INSERT INTO voice_drafts (
        id, group_id, member_id, transcript, title, category, amount,
        paid_by_member_id, missing_fields, status, expense_id, created_at, updated_at
      ) VALUES (
        @id, @group_id, @member_id, @transcript, @title, @category, @amount,
        @paid_by_member_id, @missing_fields, @status, @expense_id, @created_at, @updated_at
      )
    `).run(draft);
  }

  getVoiceDraft(id: string): VoiceDraftRow | undefined {
    return this.database.raw.prepare('SELECT * FROM voice_drafts WHERE id = ?').get(id) as VoiceDraftRow | undefined;
  }

  listVoiceDrafts(groupId: string): VoiceDraftRow[] {
    return this.database.raw.prepare('SELECT * FROM voice_drafts WHERE group_id = ? ORDER BY created_at DESC').all(groupId) as VoiceDraftRow[];
  }

  setVoiceDraftStatus(id: string, status: VoiceDraftRow['status'], expenseId: string | null, updatedAt: string) {
    this.database.raw.prepare(`
      UPDATE voice_drafts SET status = ?, expense_id = ?, updated_at = ? WHERE id = ?
    `).run(status, expenseId, updatedAt, id);
  }

  updateVoiceDraftDetails(draft: VoiceDraftRow) {
    this.database.raw.prepare(`
      UPDATE voice_drafts
      SET title = @title, category = @category, amount = @amount,
        paid_by_member_id = @paid_by_member_id, missing_fields = @missing_fields,
        status = @status, updated_at = @updated_at
      WHERE id = @id
    `).run(draft);
  }

  approvedAccounting(groupId: string): {
    paid: Array<{ member_id: string; amount: number }>;
    owed: Array<{ member_id: string; amount: number }>;
  } {
    const paid = this.database.raw.prepare(`
      SELECT paid_by_member_id AS member_id, SUM(amount) AS amount
      FROM expenses WHERE group_id = ? AND status = 'APPROVED'
      GROUP BY paid_by_member_id
    `).all(groupId) as Array<{ member_id: string; amount: number }>;

    const owed = this.database.raw.prepare(`
      SELECT splits.member_id, SUM(splits.share_amount) AS amount
      FROM expense_splits splits
      JOIN expenses ON expenses.id = splits.expense_id
      WHERE expenses.group_id = ? AND expenses.status = 'APPROVED'
      GROUP BY splits.member_id
    `).all(groupId) as Array<{ member_id: string; amount: number }>;

    return { paid, owed };
  }

  getSpendingSummary(groupId: string): { approved: number; pending: number } {
    const row = this.database.raw.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END), 0) AS approved,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) AS pending
      FROM expenses WHERE group_id = ?
    `).get(groupId) as { approved: number; pending: number };
    return row;
  }
}
