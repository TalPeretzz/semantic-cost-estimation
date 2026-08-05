import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LlmPromptBuilder } from './llm-prompt.builder';
import { llmOutputSchema, LlmOutput } from './schemas/llm-output.schema';

export interface SignalComparison {
  claudeLevel: string;
  gptLevel: string;
  agreed: boolean;
}

export interface ValidationResult {
  gptModel: string;
  agreementRate: number;
  totalSignals: number;
  agreedSignals: number;
  perSignal: Record<string, SignalComparison>;
  runAt: string;
}

const GPT_MODEL = 'gpt-4o-mini';

@Injectable()
export class GptValidationService {
  private readonly client: OpenAI;
  private readonly logger = new Logger(GptValidationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly promptBuilder: LlmPromptBuilder,
  ) {
    this.client = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  async validate(
    normalizedText: string,
    claudeOutput: LlmOutput,
  ): Promise<ValidationResult | null> {
    try {
      const response = await this.client.chat.completions.create({
        model: GPT_MODEL,
        max_tokens: 2048,
        messages: [
          { role: 'system', content: this.promptBuilder.systemPrompt() },
          { role: 'user',   content: this.promptBuilder.userPrompt(normalizedText) },
        ],
      });

      const raw = response.choices[0]?.message?.content ?? '';
      const gptOutput = this.parseOutput(raw);
      if (!gptOutput) return null;

      return this.compare(claudeOutput, gptOutput);
    } catch (err) {
      this.logger.warn(`GPT validation failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  private parseOutput(raw: string): LlmOutput | null {
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return null;
      const parsed = JSON.parse(match[0]);
      return llmOutputSchema.parse(parsed);
    } catch {
      return null;
    }
  }

  private compare(claude: LlmOutput, gpt: LlmOutput): ValidationResult {
    const perSignal: Record<string, SignalComparison> = {};
    let agreed = 0;

    for (const key of Object.keys(claude) as Array<keyof LlmOutput>) {
      const claudeLevel = claude[key].level;
      const gptLevel    = gpt[key]?.level ?? 'medium';
      const match       = claudeLevel === gptLevel;
      if (match) agreed++;
      perSignal[key] = { claudeLevel, gptLevel, agreed: match };
    }

    const total = Object.keys(claude).length;
    return {
      gptModel:      GPT_MODEL,
      agreementRate: total > 0 ? agreed / total : 0,
      totalSignals:  total,
      agreedSignals: agreed,
      perSignal,
      runAt:         new Date().toISOString(),
    };
  }
}
