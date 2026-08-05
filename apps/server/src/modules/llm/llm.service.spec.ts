import { LlmService } from './llm.service';
import { LlmPromptBuilder } from './llm-prompt.builder';
import { LlmUnavailableException } from './exceptions/llm-unavailable.exception';

const validLlmResponse = {
  functional_complexity:    { level: 'high',   rationale: 'Complex business logic.' },
  architectural_complexity: { level: 'medium', rationale: 'Standard layered architecture.' },
  external_integrations:    { level: 'low',    rationale: 'Few external APIs.' },
  requirement_stability:    { level: 'high',   rationale: 'Requirements are well defined.' },
  uncertainty:              { level: 'low',    rationale: 'Team has prior experience.' },
  reliability_requirement:  { level: 'medium', rationale: 'Moderate reliability needed.' },
  platform_complexity:      { level: 'low',    rationale: 'Standard cloud deployment.' },
  schedule_pressure:        { level: 'medium', rationale: 'Typical sprint cadence.' },
  data_complexity:          { level: 'low',    rationale: 'Simple data model.' },
  team_experience_gap:      { level: 'low',    rationale: 'Experienced team.' },
  precedentedness:          { level: 'medium', rationale: 'Some prior experience.' },
  development_flexibility:  { level: 'medium', rationale: 'Normal flexibility.' },
  architecture_risk:        { level: 'medium', rationale: 'Architecture reasonably resolved.' },
  team_cohesion:            { level: 'medium', rationale: 'Standard team.' },
  process_maturity:         { level: 'medium', rationale: 'Defined process.' },
};

function makeTextContent(text: string) {
  return { type: 'text' as const, text };
}

const mockCreate = jest.fn();
const mockAnthropicClient = { messages: { create: mockCreate } };

jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockAnthropicClient),
  };
});

const mockConfig = { getOrThrow: jest.fn().mockReturnValue('sk-ant-test') };
const promptBuilder = new LlmPromptBuilder();

function makeService() {
  return new LlmService(mockConfig as any, promptBuilder);
}

describe('LlmService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractSignals', () => {
    it('returns parsed LlmOutput on first attempt when Claude returns valid JSON', async () => {
      mockCreate.mockResolvedValue({
        content: [makeTextContent(JSON.stringify(validLlmResponse))],
      });

      const service = makeService();
      const result = await service.extractSignals('a project description');

      expect(result.functional_complexity.level).toBe('high');
      expect(result.uncertainty.level).toBe('low');
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('extracts JSON embedded in surrounding prose', async () => {
      const withProse = `Here is my analysis:\n${JSON.stringify(validLlmResponse)}\nEnd of response.`;
      mockCreate.mockResolvedValue({ content: [makeTextContent(withProse)] });

      const service = makeService();
      const result = await service.extractSignals('text');

      expect(result.requirement_stability.level).toBe('high');
    });

    it('retries once after invalid JSON on first attempt then succeeds', async () => {
      mockCreate
        .mockResolvedValueOnce({ content: [makeTextContent('not json at all')] })
        .mockResolvedValueOnce({ content: [makeTextContent(JSON.stringify(validLlmResponse))] });

      const service = makeService();
      // suppress the real setTimeout delay in retry
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

      const result = await service.extractSignals('text');

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(result.functional_complexity.level).toBe('high');
    });

    it('throws LlmUnavailableException after 3 consecutive failures', async () => {
      mockCreate.mockResolvedValue({ content: [makeTextContent('bad json')] });

      const service = makeService();
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

      await expect(service.extractSignals('text')).rejects.toThrow(LlmUnavailableException);
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('retries when Zod schema validation fails and throws after 3 attempts', async () => {
      const invalidLevel = {
        ...validLlmResponse,
        functional_complexity: { level: 'extreme', rationale: 'too extreme' },
      };
      mockCreate.mockResolvedValue({ content: [makeTextContent(JSON.stringify(invalidLevel))] });

      const service = makeService();
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

      await expect(service.extractSignals('text')).rejects.toThrow(LlmUnavailableException);
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('retries when the API call itself rejects', async () => {
      mockCreate
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce({ content: [makeTextContent(JSON.stringify(validLlmResponse))] });

      const service = makeService();
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

      const result = await service.extractSignals('text');
      expect(result.architectural_complexity.level).toBe('medium');
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });
  });
});
