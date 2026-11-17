import OpenAI, { toFile } from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { AppError } from '../../lib/errors.js';

const extractedExpenseSchema = z.object({
  isExpense: z.boolean(),
  title: z.string().trim().min(1).max(80).nullable(),
  category: z.enum(['Food', 'Transport', 'Hotel', 'Shopping', 'Entertainment', 'Extra']).nullable(),
  amount: z.number().int().positive().nullable(),
  paidByName: z.string().trim().min(1).max(40).nullable(),
});

export type VoiceExpenseExtraction = {
  transcript: string;
  title: string | null;
  category: z.infer<typeof extractedExpenseSchema>['category'];
  amount: number | null;
  paidByName: string | null;
};

export type VoiceContext = { currentMemberName: string; memberNames: string[] };

export type VoiceAudio = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
};

export interface VoiceAI {
  transcribeAndExtract(audio: VoiceAudio, context: VoiceContext): Promise<VoiceExpenseExtraction>;
}

type OpenAIVoiceAIOptions = {
  apiKey: string;
  transcriptionModel: string;
  parserModel: string;
};

export class OpenAIVoiceAI implements VoiceAI {
  private readonly client: OpenAI;

  constructor(private readonly options: OpenAIVoiceAIOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey });
  }

  async transcribeAndExtract(audio: VoiceAudio, context: VoiceContext): Promise<VoiceExpenseExtraction> {
    try {
      const transcription = await this.client.audio.transcriptions.create({
        file: await toFile(audio.buffer, audio.filename, { type: audio.mimeType }),
        model: this.options.transcriptionModel,
        prompt: 'Roman Urdu, Urdu aur Hinglish trip expense. Names aur PKR amounts bilkul sahi likho.',
      });
      const transcript = transcription.text.trim();
      if (!transcript) throw new AppError(422, 'VOICE_NOT_UNDERSTOOD', 'Audio mein koi clear baat samajh nahi aayi. Dobara bol kar try karein.');

      const response = await this.client.responses.parse({
        model: this.options.parserModel,
        input: [
          {
            role: 'system',
            content: `You convert one Roman Urdu, Urdu, or Hinglish trip-expense sentence into one structured PKR expense draft. Current speaker is ${JSON.stringify(context.currentMemberName)}. Group members are ${JSON.stringify(context.memberNames)}. Words like "maine", "mera", or "mene" mean the current speaker. Never invent missing facts: title, category, amount, and paidByName must be null when the audio does not clearly provide them. Use a group member's exact name when identifiable. Pick the closest allowed category only when the purpose is clear. Set isExpense false only when there is no expense intent at all.`,
          },
          { role: 'user', content: transcript },
        ],
        text: { format: zodTextFormat(extractedExpenseSchema, 'expense_draft') },
      });
      const parsed = response.output_parsed;
      if (!parsed?.isExpense) {
        throw new AppError(422, 'VOICE_NOT_UNDERSTOOD', 'Kharcha clear nahi tha. Misal: “Dinner ke 8200 maine diye”.');
      }
      return { transcript, title: parsed.title, category: parsed.category, amount: parsed.amount, paidByName: parsed.paidByName };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(502, 'VOICE_AI_FAILED', 'Voice AI abhi jawab nahi de saka. Dobara try karein.');
    }
  }
}

export class UnavailableVoiceAI implements VoiceAI {
  async transcribeAndExtract(): Promise<VoiceExpenseExtraction> {
    throw new AppError(503, 'VOICE_AI_NOT_CONFIGURED', 'Server par OPENAI_API_KEY configure nahi hai.');
  }
}
