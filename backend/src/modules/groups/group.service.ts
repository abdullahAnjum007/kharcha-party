import type { EventHub } from '../../lib/event-hub.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { createGroupCode, createId, nowIso } from '../../lib/id.js';
import { createInviteCode, hashInviteCode } from '../../lib/invite-code.js';
import type { GroupRow, KharchaRepository, MemberRow } from '../../db/repository.js';

export type CreateGroupInput = {
  name: string;
  creatorName: string;
  memberNames?: string[] | undefined;
};

const mapMember = (member: MemberRow, inviteCode?: string) => ({
  id: member.id,
  name: member.name,
  joined: member.session_active === 1,
  joinedAt: member.joined_at,
  ...(inviteCode ? { inviteCode } : {}),
});

const mapGroup = (group: GroupRow, memberCount: number) => ({
  id: group.id,
  name: group.name,
  code: group.code,
  status: group.status,
  leaderId: group.leader_id,
  votingRound: group.voting_round,
  budget: {
    mode: group.budget_mode,
    status: group.budget_status,
    individualAmount: group.individual_budget,
    groupAmount: group.individual_budget * memberCount,
  },
  createdAt: group.created_at,
  updatedAt: group.updated_at,
});

export class GroupService {
  constructor(
    private readonly repository: KharchaRepository,
    private readonly events: EventHub,
    private readonly inviteCodeSecret: string,
  ) {}

  create(input: CreateGroupInput) {
    const timestamp = nowIso();
    const groupId = createId();
    const creatorId = createId();
    const code = this.uniqueCode();
    const names = this.uniqueNames([input.creatorName, ...(input.memberNames ?? [])]);

    if (names.length > 50) throw badRequest('A group can have at most 50 members.');

    const group: GroupRow = {
      id: groupId,
      name: input.name.trim(),
      code,
      status: 'ACTIVE',
      leader_id: null,
      voting_round: 1,
      budget_mode: 'UNDECIDED',
      budget_status: 'UNSET',
      individual_budget: 0,
      created_at: timestamp,
      updated_at: timestamp,
    };

    const usedHashes = new Set<string>();
    const membersWithCodes = names.map((name, index) => {
      const credential = this.newInviteCredential(groupId, usedHashes);
      return {
        inviteCode: credential.code,
        member: {
          id: index === 0 ? creatorId : createId(),
          group_id: groupId,
          name,
          invite_code_hash: credential.hash,
          session_active: index === 0 ? 1 : 0,
          joined_at: index === 0 ? timestamp : null,
          created_at: timestamp,
        } satisfies MemberRow,
      };
    });
    const members = membersWithCodes.map((item) => item.member);

    this.repository.transaction(() => {
      this.repository.insertGroup(group);
      for (const member of members) this.repository.insertMember(member);
    });

    this.events.publish({ type: 'group.created', groupId, occurredAt: timestamp, payload: { groupId, memberCount: members.length } });
    const mappedMembers = membersWithCodes.map((item) => mapMember(item.member, item.inviteCode));
    return { group: mapGroup(group, members.length), members: mappedMembers, member: mappedMembers[0]! };
  }

  loginWithInviteCode(code: string, inviteCode: string) {
    const group = this.repository.getGroupByCode(code.trim().toUpperCase());
    if (!group) throw notFound('Trip code nahi mila. Code dobara check karein.');
    if (group.status !== 'ACTIVE') throw conflict('Yeh group already settle ho chuka hai.');

    const timestamp = nowIso();
    const codeHash = hashInviteCode(this.inviteCodeSecret, group.id, inviteCode);
    let member = this.repository.getMemberByInviteCodeHash(group.id, codeHash);
    if (!member) throw forbidden('Personal invitation code ghalat hai.');
    if (member.session_active !== 1) this.repository.activateMember(member.id, timestamp);
    member = { ...member, session_active: 1, joined_at: member.joined_at ?? timestamp };

    this.events.publish({ type: 'member.logged_in', groupId: group.id, occurredAt: timestamp, payload: { member: mapMember(member) } });
    return { group: mapGroup(group, this.repository.listMembers(group.id).length), member: mapMember(member) };
  }

  addMembers(groupId: string, requesterId: string, names: string[]) {
    const group = this.requireGroup(groupId);
    if (group.leader_id && group.leader_id !== requesterId) throw forbidden('Sirf leader naye members add kar sakta hai.');

    const existing = this.repository.listMembers(groupId);
    const incoming = this.uniqueNames(names).filter(
      (name) => !existing.some((member) => member.name.localeCompare(name, undefined, { sensitivity: 'accent' }) === 0),
    );
    if (existing.length + incoming.length > 50) throw badRequest('A group can have at most 50 members.');

    const timestamp = nowIso();
    const usedHashes = new Set(existing.map((member) => member.invite_code_hash).filter((hash): hash is string => Boolean(hash)));
    const created = incoming.map((name) => {
      const credential = this.newInviteCredential(groupId, usedHashes);
      return {
        inviteCode: credential.code,
        member: {
          id: createId(),
          group_id: groupId,
          name,
          invite_code_hash: credential.hash,
          session_active: 0,
          joined_at: null,
          created_at: timestamp,
        } satisfies MemberRow,
      };
    });
    this.repository.transaction(() => created.forEach((item) => this.repository.insertMember(item.member)));
    const members = created.map((item) => mapMember(item.member, item.inviteCode));
    this.events.publish({
      type: 'members.added',
      groupId,
      occurredAt: timestamp,
      payload: { members: members.map((member) => ({ id: member.id, name: member.name, joined: member.joined, joinedAt: member.joinedAt })) },
    });
    return members;
  }

  resetInviteCode(groupId: string, requesterId: string, memberId: string) {
    const group = this.requireGroup(groupId);
    if (group.leader_id !== requesterId) throw forbidden('Sirf leader personal code reset kar sakta hai.');
    const member = this.requireMemberInGroup(groupId, memberId);
    const credential = this.newInviteCredential(groupId);
    this.repository.updateInviteCodeHash(member.id, credential.hash);
    const timestamp = nowIso();
    this.events.publish({ type: 'member.invite_code_reset', groupId, occurredAt: timestamp, payload: { memberId } });
    return mapMember({ ...member, invite_code_hash: credential.hash }, credential.code);
  }

  snapshot(groupId: string) {
    const group = this.requireGroup(groupId);
    const members = this.repository.listMembers(groupId);
    return { group: mapGroup(group, members.length), members: members.map((member) => mapMember(member)) };
  }

  castVote(groupId: string, voterId: string, candidateId: string) {
    const group = this.requireGroup(groupId);
    if (group.leader_id) throw conflict('Leader already elect ho chuka hai.');
    const voter = this.requireMemberInGroup(groupId, voterId);
    this.requireMemberInGroup(groupId, candidateId);
    if (voter.session_active !== 1) throw forbidden('Vote dene ke liye member ka joined hona zaroori hai.');

    const timestamp = nowIso();
    this.repository.castVote(groupId, group.voting_round, voterId, candidateId, timestamp);
    const totalVotes = this.repository.countVotes(groupId, group.voting_round);
    const eligibleVoters = this.repository.listMembers(groupId).length;
    const counts = this.repository.getVoteCounts(groupId, group.voting_round);
    const results = counts.map((count) => ({
      candidateId: count.candidate_id,
      candidateName: this.repository.getMember(count.candidate_id)?.name ?? 'Unknown',
      votes: count.votes,
    }));

    let outcome: 'PENDING' | 'ELECTED' | 'TIE' = 'PENDING';
    let leader = null as ReturnType<typeof mapMember> | null;
    let nextRound = group.voting_round;

    if (totalVotes >= eligibleVoters && counts.length > 0) {
      const topVotes = counts[0]!.votes;
      const winners = counts.filter((count) => count.votes === topVotes);
      if (winners.length === 1) {
        this.repository.setLeader(groupId, winners[0]!.candidate_id, timestamp);
        leader = mapMember(this.repository.getMember(winners[0]!.candidate_id)!);
        outcome = 'ELECTED';
      } else {
        this.repository.advanceVotingRound(groupId, timestamp);
        outcome = 'TIE';
        nextRound += 1;
      }
    }

    this.events.publish({ type: 'vote.updated', groupId, occurredAt: timestamp, payload: { outcome, results, leader, nextRound } });
    return { outcome, round: group.voting_round, nextRound, votesReceived: totalVotes, eligibleVoters, results, leader };
  }

  proposeBudget(groupId: string, memberId: string, mode: 'DECIDED' | 'FLEXIBLE', individualBudget: number) {
    this.requireMemberInGroup(groupId, memberId);
    const timestamp = nowIso();
    this.repository.proposeBudget(groupId, mode, individualBudget, timestamp);
    const budget = this.snapshot(groupId).group.budget;
    this.events.publish({ type: 'budget.proposed', groupId, occurredAt: timestamp, payload: { budget, proposedBy: memberId } });
    return budget;
  }

  lockBudget(groupId: string, memberId: string) {
    const group = this.requireGroup(groupId);
    if (!group.leader_id) throw conflict('Pehle leader elect karein.');
    if (group.leader_id !== memberId) throw forbidden('Sirf leader budget lock kar sakta hai.');
    if (group.budget_status !== 'PROPOSED') throw conflict('Lock karne se pehle budget propose karein.');

    const timestamp = nowIso();
    this.repository.lockBudget(groupId, timestamp);
    const budget = this.snapshot(groupId).group.budget;
    this.events.publish({ type: 'budget.locked', groupId, occurredAt: timestamp, payload: { budget, lockedBy: memberId } });
    return budget;
  }

  requireGroup(groupId: string): GroupRow {
    const group = this.repository.getGroup(groupId);
    if (!group) throw notFound('Group nahi mila.');
    return group;
  }

  requireMemberInGroup(groupId: string, memberId: string): MemberRow {
    const member = this.repository.getMember(memberId);
    if (!member || member.group_id !== groupId) throw forbidden('Aap is group ka hissa nahi hain.');
    return member;
  }

  private uniqueCode() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = createGroupCode();
      if (!this.repository.groupCodeExists(code)) return code;
    }
    throw conflict('Unique trip code generate nahi ho saka. Dobara try karein.');
  }

  private uniqueNames(names: string[]) {
    const result: string[] = [];
    const seen = new Set<string>();
    for (const rawName of names) {
      const name = rawName.trim();
      if (!name) continue;
      const key = name.toLocaleLowerCase('en');
      if (!seen.has(key)) {
        seen.add(key);
        result.push(name);
      }
    }
    return result;
  }

  private newInviteCredential(groupId: string, usedHashes = new Set<string>()) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const code = createInviteCode();
      const hash = hashInviteCode(this.inviteCodeSecret, groupId, code);
      if (!usedHashes.has(hash) && !this.repository.inviteCodeHashExists(groupId, hash)) {
        usedHashes.add(hash);
        return { code, hash };
      }
    }
    throw conflict('Unique 4-digit invitation code generate nahi ho saka. Dobara try karein.');
  }
}
