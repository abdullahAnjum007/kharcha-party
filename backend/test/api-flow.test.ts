import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { VoiceAI } from '../src/modules/voice/voice-ai.js';

type Member = { id: string; name: string; joined: boolean; inviteCode?: string };
type Group = {
  id: string;
  name: string;
  code: string;
  leaderId: string | null;
  budget: { status: string; individualAmount: number; groupAmount: number };
};
type Expense = { id: string; status: string; amount: number; source: string };

const fakeVoiceAI: VoiceAI = {
  async transcribeAndExtract() {
    return { transcript: 'Ali ne dinner ke 8200 diye', title: 'Dinner scene', category: 'Food', amount: 8_200 };
  },
};

function audioMultipart() {
  const boundary = '----kharcha-party-test-boundary';
  const payload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="expense.m4a"\r\nContent-Type: audio/mp4\r\n\r\n`),
    Buffer.from('fake-audio-for-provider'),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { payload, contentType: `multipart/form-data; boundary=${boundary}` };
}

void test('complete group, budget, expense, voice, and settlement flow', async (context) => {
  const app = await buildApp({
    databasePath: ':memory:',
    jwtSecret: 'test-secret-that-is-long-enough-for-jwt',
    logger: false,
    voiceAI: fakeVoiceAI,
  });
  context.after(async () => app.close());

  const createResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/groups',
    payload: { name: 'Hunza Scene 2026', creatorName: 'Ali', memberNames: ['Sara'] },
  });
  assert.equal(createResponse.statusCode, 201);
  const created = createResponse.json<{ data: { group: Group; members: Member[]; member: Member; token: string } }>();
  assert.match(created.data.group.code, /^KHP-/);
  assert.equal(created.data.members.length, 2);
  const ali = created.data.member;
  const saraInvite = created.data.members.find((member) => member.name === 'Sara');
  assert.ok(saraInvite);
  assert.match(saraInvite.inviteCode ?? '', /^\d{4}$/);

  const aliAuth = { authorization: `Bearer ${created.data.token}` };
  const joinResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/invite',
    payload: { groupCode: created.data.group.code, inviteCode: saraInvite.inviteCode },
  });
  assert.equal(joinResponse.statusCode, 200);
  const joined = joinResponse.json<{ data: { member: Member; token: string } }>();
  assert.equal(joined.data.member.id, saraInvite.id);
  const saraAuth = { authorization: `Bearer ${joined.data.token}` };

  const aliVoteResponse = await app.inject({
    method: 'POST',
    url: `/api/v1/groups/${created.data.group.id}/votes`,
    headers: aliAuth,
    payload: { candidateId: ali.id },
  });
  assert.equal(aliVoteResponse.statusCode, 200);
  assert.equal(aliVoteResponse.json<{ data: { outcome: string } }>().data.outcome, 'PENDING');

  const saraVoteResponse = await app.inject({
    method: 'POST',
    url: `/api/v1/groups/${created.data.group.id}/votes`,
    headers: saraAuth,
    payload: { candidateId: ali.id },
  });
  assert.equal(saraVoteResponse.statusCode, 200);
  assert.equal(saraVoteResponse.json<{ data: { outcome: string } }>().data.outcome, 'ELECTED');

  const resetCodeResponse = await app.inject({
    method: 'POST',
    url: `/api/v1/groups/${created.data.group.id}/members/${joined.data.member.id}/invite-code/reset`,
    headers: aliAuth,
  });
  assert.equal(resetCodeResponse.statusCode, 200);
  const resetMember = resetCodeResponse.json<{ data: { member: Member } }>().data.member;
  assert.match(resetMember.inviteCode ?? '', /^\d{4}$/);
  assert.notEqual(resetMember.inviteCode, saraInvite.inviteCode);

  const oldCodeLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/invite',
    payload: { groupCode: created.data.group.code, inviteCode: saraInvite.inviteCode },
  });
  assert.equal(oldCodeLogin.statusCode, 403);

  const resetCodeLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/invite',
    payload: { groupCode: created.data.group.code, inviteCode: resetMember.inviteCode },
  });
  assert.equal(resetCodeLogin.statusCode, 200);
  assert.equal(resetCodeLogin.json<{ data: { member: Member } }>().data.member.id, joined.data.member.id);

  const proposeResponse = await app.inject({
    method: 'PUT',
    url: `/api/v1/groups/${created.data.group.id}/budget`,
    headers: aliAuth,
    payload: { mode: 'DECIDED', individualBudget: 25_000 },
  });
  assert.equal(proposeResponse.statusCode, 200);

  const lockResponse = await app.inject({
    method: 'POST',
    url: `/api/v1/groups/${created.data.group.id}/budget/lock`,
    headers: aliAuth,
  });
  assert.equal(lockResponse.statusCode, 200);
  const lockedBudget = lockResponse.json<{ data: { budget: Group['budget'] } }>();
  assert.equal(lockedBudget.data.budget.status, 'LOCKED');
  assert.equal(lockedBudget.data.budget.groupAmount, 50_000);

  const expenseResponse = await app.inject({
    method: 'POST',
    url: `/api/v1/groups/${created.data.group.id}/expenses`,
    headers: saraAuth,
    payload: { title: 'Dinner scene', category: 'Food', amount: 8_200, paidByMemberId: joined.data.member.id },
  });
  assert.equal(expenseResponse.statusCode, 201);
  const submittedExpense = expenseResponse.json<{ data: { expense: Expense } }>().data.expense;
  assert.equal(submittedExpense.status, 'PENDING');

  const approvalResponse = await app.inject({
    method: 'PATCH',
    url: `/api/v1/groups/${created.data.group.id}/expenses/${submittedExpense.id}/status`,
    headers: aliAuth,
    payload: { status: 'APPROVED' },
  });
  assert.equal(approvalResponse.statusCode, 200);
  assert.equal(approvalResponse.json<{ data: { expense: Expense } }>().data.expense.status, 'APPROVED');

  const voiceResponse = await app.inject({
    method: 'POST',
    url: `/api/v1/groups/${created.data.group.id}/voice-logs`,
    headers: aliAuth,
    payload: { transcript: 'Hotel 12,000 sab ke liye' },
  });
  assert.equal(voiceResponse.statusCode, 201);
  const voiceData = voiceResponse.json<{ data: { voiceLog: { status: string }; expense: Expense } }>();
  assert.equal(voiceData.data.voiceLog.status, 'ACCEPTED');
  assert.equal(voiceData.data.expense.amount, 12_000);
  assert.equal(voiceData.data.expense.source, 'VOICE');
  assert.equal(voiceData.data.expense.status, 'APPROVED');

  const audio = audioMultipart();
  const draftResponse = await app.inject({
    method: 'POST',
    url: `/api/v1/groups/${created.data.group.id}/voice-drafts`,
    headers: { ...aliAuth, 'content-type': audio.contentType },
    payload: audio.payload,
  });
  assert.equal(draftResponse.statusCode, 201);
  const draft = draftResponse.json<{ data: { voiceDraft: { id: string; transcript: string; amount: number; status: string } } }>().data.voiceDraft;
  assert.equal(draft.transcript, 'Ali ne dinner ke 8200 diye');
  assert.equal(draft.amount, 8_200);
  assert.equal(draft.status, 'PENDING_REVIEW');

  const acceptDraftResponse = await app.inject({
    method: 'POST',
    url: `/api/v1/groups/${created.data.group.id}/voice-drafts/${draft.id}/accept`,
    headers: aliAuth,
  });
  assert.equal(acceptDraftResponse.statusCode, 200);
  const acceptedDraft = acceptDraftResponse.json<{ data: { voiceDraft: { status: string }; expense: Expense } }>().data;
  assert.equal(acceptedDraft.voiceDraft.status, 'ACCEPTED');
  assert.equal(acceptedDraft.expense.amount, 8_200);
  assert.equal(acceptedDraft.expense.source, 'VOICE');

  const deniedAudio = audioMultipart();
  const deniedDraftResponse = await app.inject({
    method: 'POST',
    url: `/api/v1/groups/${created.data.group.id}/voice-drafts`,
    headers: { ...aliAuth, 'content-type': deniedAudio.contentType },
    payload: deniedAudio.payload,
  });
  const deniedDraft = deniedDraftResponse.json<{ data: { voiceDraft: { id: string } } }>().data.voiceDraft;
  const denyResponse = await app.inject({
    method: 'POST',
    url: `/api/v1/groups/${created.data.group.id}/voice-drafts/${deniedDraft.id}/deny`,
    headers: aliAuth,
  });
  assert.equal(denyResponse.statusCode, 200);
  assert.equal(denyResponse.json<{ data: { voiceDraft: { status: string } } }>().data.voiceDraft.status, 'DENIED');

  const dashboardResponse = await app.inject({
    method: 'GET',
    url: `/api/v1/groups/${created.data.group.id}/dashboard`,
    headers: aliAuth,
  });
  assert.equal(dashboardResponse.statusCode, 200);
  const dashboard = dashboardResponse.json<{
    data: {
      currentMember: { role: string };
      spending: { approved: number; groupBudget: number; remaining: number };
      settlement: { payments: Array<{ amount: number }> };
    };
  }>();
  assert.equal(dashboard.data.currentMember.role, 'LEADER');
  assert.equal(dashboard.data.spending.approved, 28_400);
  assert.equal(dashboard.data.spending.groupBudget, 50_000);
  assert.equal(dashboard.data.spending.remaining, 21_600);
  assert.ok(dashboard.data.settlement.payments.length > 0);

  const unauthorizedApproval = await app.inject({
    method: 'PATCH',
    url: `/api/v1/groups/${created.data.group.id}/expenses/${submittedExpense.id}/status`,
    headers: saraAuth,
    payload: { status: 'REJECTED' },
  });
  assert.equal(unauthorizedApproval.statusCode, 403);
  assert.equal(unauthorizedApproval.json<{ error: { code: string } }>().error.code, 'FORBIDDEN');
});

void test('validation and authentication errors use a stable API envelope', async (context) => {
  const app = await buildApp({ databasePath: ':memory:', jwtSecret: 'another-test-secret-that-is-long-enough' });
  context.after(async () => app.close());

  const invalid = await app.inject({ method: 'POST', url: '/api/v1/groups', payload: { name: 'x' } });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.json<{ error: { code: string } }>().error.code, 'VALIDATION_ERROR');

  const protectedResponse = await app.inject({ method: 'GET', url: '/api/v1/groups/40e9bca9-a483-47a7-badc-01ffb40695ad' });
  assert.equal(protectedResponse.statusCode, 401);
  assert.equal(protectedResponse.json<{ error: { code: string } }>().error.code, 'UNAUTHORIZED');
});
