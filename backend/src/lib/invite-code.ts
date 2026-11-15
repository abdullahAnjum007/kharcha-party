import { createHmac, randomInt } from 'node:crypto';

export function createInviteCode(): string {
  return randomInt(0, 10_000).toString().padStart(4, '0');
}

export function hashInviteCode(secret: string, groupId: string, inviteCode: string): string {
  return createHmac('sha256', secret).update(`${groupId}:${inviteCode}`).digest('hex');
}
