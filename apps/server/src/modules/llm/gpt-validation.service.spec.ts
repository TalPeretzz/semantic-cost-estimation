import { GptValidationService } from './gpt-validation.service';
import { LlmPromptBuilder } from './llm-prompt.builder';

const validClaudeOutput = {
  functional_complexity:    { level: 'high' as const,   rationale: 'Complex.' },
  architectural_complexity: { level: 'medium' as const, rationale: 'Standard.' },
  external_integrations:    { level: 'low' as const,    rationale: 'Few APIs.' },
  requirement_stability:    { level: 'low' as const,    rationale: 'Stable.' },
  uncertainty:              { level: 'medium' as const, rationale: 'Some unknowns.' },
  reliability_requirement:  { level: 'high' as const,   rationale: 'Financial risk.' },
  platform_complexity:      { level: 'low' as const,    rationale: 'Standard cloud.' },
  schedule_pressure:        { level: 'medium' as const, rationale: 'Normal cadence.' },
  data_complexity:          { level: 'low' as const,    rationale: 'Simple schema.' },
  team_experience_gap:      { level: 'low' as const,    rationale: 'Experienced team.' },
  precedentedness:          { level: 'medium' as const, rationale: 'Some prior work.' },
  development_flexibility:  { level: 'medium' as const, rationale: 'Normal agile.' },
  architecture_risk:        { level: 'medium' as const, rationale: 'Defined arch.' },
  team_cohesion:            { level: 'high' as const,   rationale: 'Good team.' },
  process_maturity:         { level: 'medium' as const, rationale: 'Standard CI/CD.' },
};

const mockCreate = jest.fn();
const mockOpenAiClient = { chat: { completions: { create: mockCreate } } };

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockOpenAiClient),
}));

const mockConfig = { getOrThrow: jest.fn().mockReturnValue('sk-test') };
const promptBuilder = new LlmPromptBuilder();

function makeService() {
  return new GptValidationService(mockConfig as any, promptBuilder);
}

function gptResponse(overrides: Record<string, { level: string; rationale: string }> = {}) {
  return { choices: [{ message: { content: JSON.stringify({ ...validClaudeOutput, ...overrides }) } }] };
}

describe('GptValidationService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('validate — happy path', () => {
    it('returns 100% agreement when GPT output matches Claude exactly', async () => {
      mockCreate.mockResolvedValue(gptResponse());
      const service = makeService();

      const result = await service.validate('a project description', validClaudeOutput);

      expect(result).not.toBeNull();
      expect(result!.agreementRate).toBe(1);
      expect(result!.agreedSignals).toBe(15);
      expect(result!.totalSignals).toBe(15);
      expect(result!.gptModel).toBe('gpt-4o-mini');
    });

    it('counts diverged signals correctly when GPT disagrees on some levels', async () => {
      mockCreate.mockResolvedValue(gptResponse({
        functional_complexity: { level: 'very_high', rationale: 'Different view.' },
        uncertainty:           { level: 'high',      rationale: 'Different view.' },
      }));
      const service = makeService();

      const result = await service.validate('text', validClaudeOutput);

      expect(result!.agreedSignals).toBe(13);
      expect(result!.agreementRate).toBeCloseTo(13 / 15, 5);
    });

    it('marks individual signals as agreed or diverged correctly', async () => {
      mockCreate.mockResolvedValue(gptResponse({
        functional_complexity: { level: 'medium', rationale: 'GPT disagrees.' },
      }));
      const service = makeService();

      const result = await service.validate('text', validClaudeOutput);

      expect(result!.perSignal['functional_complexity'].agreed).toBe(false);
      expect(result!.perSignal['functional_complexity'].claudeLevel).toBe('high');
      expect(result!.perSignal['functional_complexity'].gptLevel).toBe('medium');
      expect(result!.perSignal['architectural_complexity'].agreed).toBe(true);
    });

    it('includes runAt timestamp in ISO format', async () => {
      mockCreate.mockResolvedValue(gptResponse());
      const service = makeService();

      const result = await service.validate('text', validClaudeOutput);

      expect(new Date(result!.runAt).toISOString()).toBe(result!.runAt);
    });
  });

  describe('validate — resilience', () => {
    it('returns null when OpenAI API call throws', async () => {
      mockCreate.mockRejectedValue(new Error('network error'));
      const service = makeService();

      const result = await service.validate('text', validClaudeOutput);

      expect(result).toBeNull();
    });

    it('returns null when GPT returns non-JSON content', async () => {
      mockCreate.mockResolvedValue({ choices: [{ message: { content: 'Sorry, I cannot do that.' } }] });
      const service = makeService();

      const result = await service.validate('text', validClaudeOutput);

      expect(result).toBeNull();
    });

    it('returns null when GPT returns JSON with invalid signal levels', async () => {
      const invalid = { ...validClaudeOutput, functional_complexity: { level: 'extreme', rationale: 'x' } };
      mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(invalid) } }] });
      const service = makeService();

      const result = await service.validate('text', validClaudeOutput);

      expect(result).toBeNull();
    });

    it('returns null when GPT returns empty content', async () => {
      mockCreate.mockResolvedValue({ choices: [{ message: { content: '' } }] });
      const service = makeService();

      const result = await service.validate('text', validClaudeOutput);

      expect(result).toBeNull();
    });

    it('extracts JSON embedded in surrounding prose', async () => {
      const prose = `Here is my analysis:\n${JSON.stringify(validClaudeOutput)}\nEnd.`;
      mockCreate.mockResolvedValue({ choices: [{ message: { content: prose } }] });
      const service = makeService();

      const result = await service.validate('text', validClaudeOutput);

      expect(result).not.toBeNull();
      expect(result!.agreementRate).toBe(1);
    });
  });
});
