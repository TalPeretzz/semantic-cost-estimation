import { Injectable } from '@nestjs/common';

const SYSTEM_PROMPT = `You are a software engineering expert specializing in cost estimation.
Evaluate the project on exactly five qualitative signals.
Return ONLY valid JSON matching the schema. Do not include effort estimates.

Signal definitions:
- functional_complexity: complexity of core business logic and features
- architectural_complexity: system design complexity (microservices, distributed state)
- external_integrations: count and complexity of third-party APIs and data sources
- requirement_stability: how stable are requirements (High = stable = lower effort)
- uncertainty: overall uncertainty about scope, technology, or team

Levels: very_low | low | medium | high | very_high

Output schema (strict JSON, no other text):
{
  "functional_complexity":    { "level": "<level>", "rationale": "<one sentence>" },
  "architectural_complexity": { "level": "<level>", "rationale": "<one sentence>" },
  "external_integrations":    { "level": "<level>", "rationale": "<one sentence>" },
  "requirement_stability":    { "level": "<level>", "rationale": "<one sentence>" },
  "uncertainty":              { "level": "<level>", "rationale": "<one sentence>" }
}`;

@Injectable()
export class LlmPromptBuilder {
  systemPrompt(): string {
    return SYSTEM_PROMPT;
  }

  userPrompt(normalizedText: string): string {
    return `Project description:\n${normalizedText}`;
  }
}
