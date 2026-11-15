import { randomBytes, randomUUID } from 'node:crypto';

export const createId = () => randomUUID();

const codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createGroupCode(): string {
  const bytes = randomBytes(6);
  const suffix = Array.from(bytes, (byte) => codeAlphabet[byte % codeAlphabet.length]).join('');
  return `KHP-${suffix}`;
}

export const nowIso = () => new Date().toISOString();
