import { SignalsService } from './signals.service';
import { OrdinalMappingService } from './ordinal-mapping.service';

const validLlmOutput = {
  functional_complexity:    { level: 'high' as const,     rationale: 'Complex logic.' },
  architectural_complexity: { level: 'medium' as const,   rationale: 'Standard layers.' },
  external_integrations:    { level: 'low' as const,      rationale: 'Few APIs.' },
  requirement_stability:    { level: 'high' as const,     rationale: 'Stable reqs.' },
  uncertainty:              { level: 'very_low' as const, rationale: 'Well known domain.' },
  reliability_requirement:  { level: 'medium' as const,   rationale: 'Moderate reliability needed.' },
  platform_complexity:      { level: 'low' as const,      rationale: 'Standard cloud deployment.' },
  schedule_pressure:        { level: 'medium' as const,   rationale: 'Typical sprint cadence.' },
  data_complexity:          { level: 'low' as const,      rationale: 'Simple data model.' },
  team_experience_gap:      { level: 'very_low' as const, rationale: 'Experienced team.' },
  precedentedness:          { level: 'medium' as const,   rationale: 'Some prior experience.' },
  development_flexibility:  { level: 'medium' as const,   rationale: 'Normal flexibility.' },
  architecture_risk:        { level: 'medium' as const,   rationale: 'Architecture reasonably resolved.' },
  team_cohesion:            { level: 'medium' as const,   rationale: 'Standard team.' },
  process_maturity:         { level: 'medium' as const,   rationale: 'Defined process.' },
};

const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  addGroupBy: jest.fn().mockReturnThis(),
  getRawMany: jest.fn(),
};

const mockRepo = {
  create: jest.fn((data) => ({ ...data })),
  save: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(() => mockQueryBuilder),
};

describe('SignalsService', () => {
  let service: SignalsService;
  const ordinalMapping = new OrdinalMappingService();

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SignalsService(mockRepo as any, ordinalMapping);
  });

  describe('createBulk', () => {
    it('saves exactly 5 signal records', async () => {
      const saved = Array.from({ length: 10 }, (_, i) => ({ id: `sig-${i}` }));
      mockRepo.save.mockResolvedValue(saved);

      const result = await service.createBulk('estimation-uuid', validLlmOutput);

      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(10);
    });

    it('maps high level to ordinal 1 and factor 1.1', async () => {
      mockRepo.save.mockResolvedValue([]);

      await service.createBulk('estimation-uuid', validLlmOutput);

      const [firstSignal] = mockRepo.save.mock.calls[0][0];
      expect(firstSignal.signalName).toBe('functional_complexity');
      expect(firstSignal.rawLevel).toBe('high');
      expect(firstSignal.ordinal).toBe(1);
      expect(firstSignal.adjustmentFactor).toBeCloseTo(1.1, 5);
    });

    it('maps very_low level to ordinal -3 and factor 0.7', async () => {
      mockRepo.save.mockResolvedValue([]);

      await service.createBulk('estimation-uuid', validLlmOutput);

      const signals: any[] = mockRepo.save.mock.calls[0][0];
      const uncertainty = signals.find((s) => s.signalName === 'uncertainty');
      expect(uncertainty.ordinal).toBe(-3);
      expect(uncertainty.adjustmentFactor).toBeCloseTo(0.7, 5);
    });

    it('stores the llmRationale from the LLM output', async () => {
      mockRepo.save.mockResolvedValue([]);

      await service.createBulk('estimation-uuid', validLlmOutput);

      const signals: any[] = mockRepo.save.mock.calls[0][0];
      const arch = signals.find((s) => s.signalName === 'architectural_complexity');
      expect(arch.llmRationale).toBe('Standard layers.');
    });
  });

  describe('findByEstimation', () => {
    it('queries by estimationId', async () => {
      mockRepo.find.mockResolvedValue([]);
      await service.findByEstimation('est-uuid');
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { estimationId: 'est-uuid' } });
    });
  });

  describe('getDistribution', () => {
    it('returns rows with count coerced to number', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { signalName: 'functional_complexity', level: 'high',   count: '42' },
        { signalName: 'functional_complexity', level: 'medium', count: '10' },
      ]);

      const result = await service.getDistribution();

      expect(result).toEqual([
        { signalName: 'functional_complexity', level: 'high',   count: 42 },
        { signalName: 'functional_complexity', level: 'medium', count: 10 },
      ]);
    });

    it('returns empty array when no signals exist', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      const result = await service.getDistribution();
      expect(result).toEqual([]);
    });
  });
});
