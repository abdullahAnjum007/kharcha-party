import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_PATH: z.string().min(1).default('./data/kharcha-party.db'),
  JWT_SECRET: z.string().min(32).default('development-only-secret-change-me-now'),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_TRANSCRIPTION_MODEL: z.string().min(1).default('gpt-transcribe'),
  OPENAI_PARSER_MODEL: z.string().min(1).default('gpt-6-luna'),
  MAX_VOICE_FILE_BYTES: z.coerce.number().int().positive().default(10_000_000),
});

export type Env = z.infer<typeof envSchema>;

export function readEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }
  return parsed.data;
}
