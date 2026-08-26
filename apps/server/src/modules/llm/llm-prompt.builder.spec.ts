import { LlmPromptBuilder } from './llm-prompt.builder';

const ALL_SIGNAL_NAMES = [
  'functional_complexity',
  'architectural_complexity',
  'external_integrations',
  'requirement_stability',
  'uncertainty',
  'reliability_requirement',
  'platform_complexity',
  'schedule_pressure',
  'data_complexity',
  'team_experience_gap',
  'precedentedness',
  'development_flexibility',
  'architecture_risk',
  'team_cohesion',
  'process_maturity',
];

const ALL_LEVELS = ['very_low', 'low', 'medium', 'high', 'very_high'];

describe('LlmPromptBuilder', () => {
  let builder: LlmPromptBuilder;

  beforeEach(() => {
    builder = new LlmPromptBuilder();
  });

  describe('systemPrompt', () => {
    it('returns a non-empty string', () => {
      expect(builder.systemPrompt().length).toBeGreaterThan(0);
    });

    it('declares exactly fifteen signal assessments', () => {
      expect(builder.systemPrompt()).toContain('fifteen signal assessments');
    });

    it('instructs the model to return only valid JSON', () => {
      expect(builder.systemPrompt()).toContain('Return ONLY valid JSON');
    });

    it('defaults unknown dimensions to medium', () => {
      expect(builder.systemPrompt()).toContain('"medium"');
    });

    it.each(ALL_SIGNAL_NAMES)('includes signal "%s"', (signal) => {
      expect(builder.systemPrompt()).toContain(signal);
    });

    it.each(ALL_LEVELS)('defines level "%s"', (level) => {
      expect(builder.systemPrompt()).toContain(level);
    });

    it('separates adjustment signals from scale factor signals', () => {
      const prompt = builder.systemPrompt();
      expect(prompt).toContain('PART 1');
      expect(prompt).toContain('PART 2');
    });

    it('warns that scale factor direction is opposite to Part 1', () => {
      expect(builder.systemPrompt()).toContain('OPPOSITE direction');
    });

    it('includes calibration examples', () => {
      const prompt = builder.systemPrompt();
      expect(prompt).toContain('Example A');
      expect(prompt).toContain('Example B');
    });

    it('returns the same string on repeated calls (idempotent)', () => {
      expect(builder.systemPrompt()).toBe(builder.systemPrompt());
    });
  });

  describe('userPrompt', () => {
    it('includes the project description verbatim', () => {
      const description = 'A fintech platform for real-time payments';
      expect(builder.userPrompt(description)).toContain(description);
    });

    it('produces different output for different descriptions', () => {
      expect(builder.userPrompt('Project A')).not.toBe(builder.userPrompt('Project B'));
    });

    it('returns a non-empty string for an empty description', () => {
      expect(builder.userPrompt('').length).toBeGreaterThan(0);
    });
  });
});
