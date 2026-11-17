const sensitiveKey = /^(authorization|cookie|set-cookie|token|accessToken|refreshToken|jwtSecret|secret|password|inviteCode|apiKey|openaiApiKey)$/i;

export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[max-depth]';
  if (Buffer.isBuffer(value)) return `[buffer:${value.length} bytes]`;
  if (typeof value === 'string') return value.length > 2_000 ? `${value.slice(0, 2_000)}…[truncated]` : value;
  if (typeof value !== 'object' || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeForLog(item, depth + 1));

  const sanitized: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    sanitized[key] = sensitiveKey.test(key) ? '[REDACTED]' : sanitizeForLog(item, depth + 1);
  }
  return sanitized;
}

export function sanitizeResponsePayload(payload: unknown): unknown {
  if (typeof payload === 'string') {
    try {
      return sanitizeForLog(JSON.parse(payload) as unknown);
    } catch {
      return sanitizeForLog(payload);
    }
  }
  if (Buffer.isBuffer(payload)) {
    const text = payload.toString('utf8');
    try {
      return sanitizeForLog(JSON.parse(text) as unknown);
    } catch {
      return `[buffer:${payload.length} bytes]`;
    }
  }
  return sanitizeForLog(payload);
}
