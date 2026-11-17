import { Platform } from 'react-native';

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
  title: string;
  category: string;
  amount: number;
  status: 'PENDING_REVIEW' | 'ACCEPTED' | 'DENIED';
  expenseId: string | null;
  createdAt: string;
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
  form.append('audio', {
    uri: input.uri,
    name: `kharcha-${Date.now()}.m4a`,
    type: 'audio/mp4',
  } as unknown as Blob);
  const response = await fetch(`${API_URL}/api/v1/groups/${input.groupId}/voice-drafts`, {
    method: 'POST',
    headers: { authorization: `Bearer ${input.token}` },
    body: form,
  });
  return decode<{ data: { voiceDraft: VoiceDraft } }>(response);
}

export async function reviewVoiceDraft(input: { groupId: string; draftId: string; token: string; decision: 'accept' | 'deny' }) {
  const response = await fetch(`${API_URL}/api/v1/groups/${input.groupId}/voice-drafts/${input.draftId}/${input.decision}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${input.token}` },
  });
  return decode<{ data: { voiceDraft: VoiceDraft } }>(response);
}
