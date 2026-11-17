import { Platform } from 'react-native';
import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';

const defaultApiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl).replace(/\/$/, '');

export type ApiMember = { id: string; name: string; inviteCode?: string };
export type ApiGroup = { id: string; name: string; code: string };
export type AuthResult = { group: ApiGroup; member: ApiMember; members?: ApiMember[]; token: string };
export type VoiceDraft = {
  id: string;
  groupId: string;
  memberId: string;
  memberName: string;
  transcript: string;
  title: string | null;
  category: string | null;
  amount: number | null;
  paidBy: { id: string; name: string } | null;
  missingFields: string[];
  status: 'PENDING_REVIEW' | 'NEEDS_DETAILS' | 'ACCEPTED' | 'DENIED';
  expenseId: string | null;
  createdAt: string;
  updatedAt: string;
};

type ErrorEnvelope = { error?: { message?: string } };

async function decode<T>(response: Response): Promise<T> {
  const body = await response.json() as T & ErrorEnvelope;
  if (!response.ok) throw new Error(body.error?.message ?? 'Server se connection nahi ho saka.');
  return body;
}

export async function createGroup(input: { name: string; creatorName: string; memberNames: string[] }) {
  const response = await fetch(`${API_URL}/api/v1/groups`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return decode<{ data: AuthResult & { members: ApiMember[] } }>(response);
}

export async function joinGroup(input: { groupCode: string; inviteCode: string }) {
  const response = await fetch(`${API_URL}/api/v1/auth/invite`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return decode<{ data: AuthResult }>(response);
}

export async function uploadVoiceDraft(input: { uri: string; groupId: string; token: string }) {
  const form = new FormData();
  const audioFile = new File(input.uri);
  form.append('audio', audioFile);
  const response = await fetch(`${API_URL}/api/v1/groups/${input.groupId}/voice-drafts`, {
    method: 'POST',
    headers: { authorization: `Bearer ${input.token}` },
    body: form,
  });
  return decode<{ data: { voiceDraft: VoiceDraft } }>(response);
}

export async function listVoiceDrafts(input: { groupId: string; token: string }) {
  const response = await fetch(`${API_URL}/api/v1/groups/${input.groupId}/voice-drafts`, {
    headers: { authorization: `Bearer ${input.token}` },
  });
  return decode<{ data: { voiceDrafts: VoiceDraft[] } }>(response);
}

export async function updateVoiceDraft(input: {
  groupId: string;
  draftId: string;
  token: string;
  details: { title: string | null; category: string | null; amount: number | null; paidByMemberId: string | null };
}) {
  const response = await fetch(`${API_URL}/api/v1/groups/${input.groupId}/voice-drafts/${input.draftId}`, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${input.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(input.details),
  });
  return decode<{ data: { voiceDraft: VoiceDraft } }>(response);
}

export async function getGroup(input: { groupId: string; token: string }) {
  const response = await fetch(`${API_URL}/api/v1/groups/${input.groupId}`, {
    headers: { authorization: `Bearer ${input.token}` },
  });
  return decode<{ data: { group: ApiGroup & { leaderId: string | null }; members: ApiMember[] } }>(response);
}

export async function reviewVoiceDraft(input: { groupId: string; draftId: string; token: string; decision: 'accept' | 'deny' }) {
  const response = await fetch(`${API_URL}/api/v1/groups/${input.groupId}/voice-drafts/${input.draftId}/${input.decision}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${input.token}` },
  });
  return decode<{ data: { voiceDraft: VoiceDraft } }>(response);
}
