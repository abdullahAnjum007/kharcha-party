import { buildApp } from './app.js';
import { readEnv } from './config/env.js';

const env = readEnv();
const app = await buildApp({
  databasePath: env.DATABASE_PATH,
  jwtSecret: env.JWT_SECRET,
  corsOrigin: env.CORS_ORIGIN,
  logger: { level: env.LOG_LEVEL },
  ...(env.OPENAI_API_KEY ? { openAIApiKey: env.OPENAI_API_KEY } : {}),
  transcriptionModel: env.OPENAI_TRANSCRIPTION_MODEL,
  parserModel: env.OPENAI_PARSER_MODEL,
  maxVoiceFileBytes: env.MAX_VOICE_FILE_BYTES,
});

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'Graceful shutdown started');
  await app.close();
  process.exit(0);
};

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
