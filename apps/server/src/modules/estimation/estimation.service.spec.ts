import { NotFoundException } from '@nestjs/common';
import { EstimationService } from './estimation.service';

const mockProject = {
  id: 'project-uuid',
  name: 'Test Project',
  sizeKloc: 10,
  domain: 'organic' as const,
  teamSize: 5,
  experienceLevel: 'nominal' as const,
  actualEffortPm: null,
  inputType: 'freetext' as const,
  descriptionText: 'A test project description',
  descriptionJson: null,
};

const mockEstimation = {
  id: 'estimation-uuid',
  projectId: 'project-uuid',
  status: 'running' as const,
  nominalEffortPm: null,
  hybridEffortPm: null,
  cocomoInputs: null,
  errorMessage: null,
};

const mockSignals = [
  { signalName: 'functional_complexity', ordinal: 1, adjustmentFactor: 1.1 },
  { signalName: 'architectural_complexity', ordinal: 0, adjustmentFactor: 1.0 },
  { signalName: 'external_integrations', ordinal: -1, adjustmentFactor: 0.9 },
  { signalName: 'requirement_stability', ordinal: 1, adjustmentFactor: 1.1 },
  { signalName: 'uncertainty', ordinal: -3, adjustmentFactor: 0.7 },
];

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
};

const mockProjectsService = { findOne: jest.fn() };
const mockCocomoService = { computeNominalEffort: jest.fn() };
const mockLlmService = { extractSignals: jest.fn() };
const mockTextNormalizer = { normalize: jest.fn() };
const mockSignalsService = { createBulk: jest.fn(), findByEstimation: jest.fn() };
const mockAdjustmentService = { compute: jest.fn() };

function makeService() {
  return new EstimationService(
    mockRepo as any,
    mockCocomoService as any,
    mockProjectsService as any,
    mockLlmService as any,
    mockTextNormalizer as any,
    mockSignalsService as any,
    mockAdjustmentService as any,
  );
}

describe('EstimationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runEstimation', () => {
    it('creates a completed estimation with hybridEffortPm for a valid project', async () => {
      mockProjectsService.findOne.mockResolvedValue(mockProject);
      mockRepo.create.mockReturnValue({ ...mockEstimation });
      mockRepo.save
        .mockResolvedValueOnce({ ...mockEstimation })
        .mockResolvedValueOnce({
          ...mockEstimation,
          status: 'completed',
          nominalEffortPm: 37.5,
          hybridEffortPm: 29.0,
        });
      mockCocomoService.computeNominalEffort.mockReturnValue({
        nominalEffortPm: 37.5,
        cocomoInputs: { A: 2.94, B: 1.097 },
      });
      mockTextNormalizer.normalize.mockReturnValue('normalized text');
      mockLlmService.extractSignals.mockResolvedValue({
        functional_complexity: { level: 'high', rationale: 'r' },
        architectural_complexity: { level: 'medium', rationale: 'r' },
        external_integrations: { level: 'low', rationale: 'r' },
        requirement_stability: { level: 'high', rationale: 'r' },
        uncertainty: { level: 'very_low', rationale: 'r' },
      });
      mockSignalsService.createBulk.mockResolvedValue(mockSignals);
      mockAdjustmentService.compute.mockReturnValue({
        productOfFactors: 0.773,
        hybridEffortPm: 29.0,
        perSignalBreakdown: [],
      });

      const service = makeService();
      const result = await service.runEstimation('project-uuid');

      expect(mockRepo.create).toHaveBeenCalledWith({ projectId: 'project-uuid', status: 'running' });
      expect(mockCocomoService.computeNominalEffort).toHaveBeenCalledWith(10, 1.0);
      expect(mockTextNormalizer.normalize).toHaveBeenCalledWith({
        inputType: 'freetext',
        descriptionText: 'A test project description',
        descriptionJson: null,
      });
      expect(mockLlmService.extractSignals).toHaveBeenCalledWith('normalized text');
      expect(mockSignalsService.createBulk).toHaveBeenCalledWith('estimation-uuid', expect.any(Object));
      expect(mockAdjustmentService.compute).toHaveBeenCalledWith(37.5, mockSignals);
      expect(result.status).toBe('completed');
    });

    it('throws NotFoundException when project does not exist', async () => {
      mockProjectsService.findOne.mockRejectedValue(new NotFoundException());

      const service = makeService();
      await expect(service.runEstimation('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('marks estimation as failed when CocomoService throws an Error', async () => {
      mockProjectsService.findOne.mockResolvedValue(mockProject);
      mockRepo.create.mockReturnValue({ ...mockEstimation });
      mockRepo.save
        .mockResolvedValueOnce({ ...mockEstimation })
        .mockResolvedValueOnce({ ...mockEstimation, status: 'failed', errorMessage: 'compute error' });
      mockCocomoService.computeNominalEffort.mockImplementation(() => {
        throw new Error('compute error');
      });

      const service = makeService();
      const result = await service.runEstimation('project-uuid');
      expect(result.status).toBe('failed');
    });

    it('marks estimation as failed when LlmService throws', async () => {
      mockProjectsService.findOne.mockResolvedValue(mockProject);
      mockRepo.create.mockReturnValue({ ...mockEstimation });
      mockRepo.save
        .mockResolvedValueOnce({ ...mockEstimation })
        .mockResolvedValueOnce({ ...mockEstimation, status: 'failed', errorMessage: 'LLM error' });
      mockCocomoService.computeNominalEffort.mockReturnValue({ nominalEffortPm: 37.5, cocomoInputs: {} });
      mockTextNormalizer.normalize.mockReturnValue('text');
      mockLlmService.extractSignals.mockRejectedValue(new Error('LLM error'));

      const service = makeService();
      const result = await service.runEstimation('project-uuid');
      expect(result.status).toBe('failed');
    });

    it('marks estimation as failed when CocomoService throws a non-Error value', async () => {
      mockProjectsService.findOne.mockResolvedValue(mockProject);
      mockRepo.create.mockReturnValue({ ...mockEstimation });
      mockRepo.save
        .mockResolvedValueOnce({ ...mockEstimation })
        .mockResolvedValueOnce({ ...mockEstimation, status: 'failed', errorMessage: 'unknown' });
      mockCocomoService.computeNominalEffort.mockImplementation(() => {
        throw 'unknown';
      });

      const service = makeService();
      const result = await service.runEstimation('project-uuid');
      expect(result.status).toBe('failed');
    });
  });

  describe('findByProject', () => {
    it('returns estimations ordered by runAt DESC', async () => {
      mockRepo.find.mockResolvedValue([mockEstimation]);
      const service = makeService();
      const result = await service.findByProject('project-uuid');
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { projectId: 'project-uuid' },
        order: { runAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('returns estimation by id', async () => {
      mockRepo.findOne.mockResolvedValue(mockEstimation);
      const service = makeService();
      const result = await service.findOne('estimation-uuid');
      expect(result).toEqual(mockEstimation);
    });

    it('throws NotFoundException when estimation does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const service = makeService();
      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneWithDetail', () => {
    it('returns estimation with signals and adjustmentResult for completed estimation', async () => {
      const completedEstimation = { ...mockEstimation, status: 'completed' as const, nominalEffortPm: 37.5 };
      mockRepo.findOne.mockResolvedValue(completedEstimation);
      mockSignalsService.findByEstimation.mockResolvedValue(mockSignals);
      const adjustmentResult = { productOfFactors: 0.773, hybridEffortPm: 29.0, perSignalBreakdown: [] };
      mockAdjustmentService.compute.mockReturnValue(adjustmentResult);

      const service = makeService();
      const result = await service.findOneWithDetail('estimation-uuid');

      expect(mockSignalsService.findByEstimation).toHaveBeenCalledWith('estimation-uuid');
      expect(mockAdjustmentService.compute).toHaveBeenCalledWith(37.5, mockSignals);
      expect(result.signals).toEqual(mockSignals);
      expect(result.adjustmentResult).toEqual(adjustmentResult);
    });

    it('returns null adjustmentResult when nominalEffortPm is null', async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockEstimation, nominalEffortPm: null });
      mockSignalsService.findByEstimation.mockResolvedValue(mockSignals);

      const service = makeService();
      const result = await service.findOneWithDetail('estimation-uuid');

      expect(mockAdjustmentService.compute).not.toHaveBeenCalled();
      expect(result.adjustmentResult).toBeNull();
    });

    it('returns null adjustmentResult when signals are empty', async () => {
      const completedEstimation = { ...mockEstimation, nominalEffortPm: 37.5 };
      mockRepo.findOne.mockResolvedValue(completedEstimation);
      mockSignalsService.findByEstimation.mockResolvedValue([]);

      const service = makeService();
      const result = await service.findOneWithDetail('estimation-uuid');

      expect(mockAdjustmentService.compute).not.toHaveBeenCalled();
      expect(result.adjustmentResult).toBeNull();
    });

    it('propagates NotFoundException from findOne', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const service = makeService();
      await expect(service.findOneWithDetail('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
