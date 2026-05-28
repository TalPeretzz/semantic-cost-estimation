import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { LlmPromptBuilder } from './llm-prompt.builder';
import { llmOutputSchema, LlmOutput } from './schemas/llm-output.schema';
import { LlmUnavailableException } from './exceptions/llm-unavailable.exception';

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 2000];
const MODEL = 'claude-sonnet-4-6';

@Injectable()
export class LlmService {
  private readonly client: Anthropic;

  constructor(
    private readonly config: ConfigService,
    private readonly promptBuilder: LlmPromptBuilder,
  ) {
    this.client = new Anthropic({
      apiKey: this.config.getOrThrow<string>('ANTHROPIC_API_KEY'),
    });
  }

  async extractSignals(normalizedText: string): Promise<LlmOutput> {
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        await this.sleep(RETRY_DELAYS_MS[attempt - 1]);
      }

      try {
        const message = await this.client.messages.create({
          model: MODEL,
          max_tokens: 1024,
          system: [
            {
              type: 'text',
              text: this.promptBuilder.systemPrompt(),
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: [
            {
              role: 'user',
              content: this.promptBuilder.userPrompt(normalizedText),
            },
          ],
        });

        const rawText = message.content
          .filter((b) => b.type === 'text')
          .map((b) => (b as { type: 'text'; text: string }).text)
          .join('');

        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON object found in LLM response');

        const parsed: unknown = JSON.parse(jsonMatch[0]);
        return llmOutputSchema.parse(parsed);
      } catch (err) {
        lastError = err;
      }
    }

    throw new LlmUnavailableException(
      lastError instanceof Error ? lastError.message : String(lastError),
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
