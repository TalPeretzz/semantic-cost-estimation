import { NotFoundException } from '@nestjs/common';
import { EstimationService } from './estimation.service';
import { CocomoService } from './cocomo.service';

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
  { signalName: 'functional_complexity', adjustmentFactor: 1.1 },
  { signalName: 'architectural_complexity', adjustmentFactor: 1.0 },
  { signalName: 'external_integrations', adjustmentFactor: 0.9 },
  { signalName: 'requirement_stability', adjustmentFactor: 1.1 },
  { signalName: 'uncertainty', adjustmentFactor: 0.7 },
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
const mockSignalsService = { createBulk: jest.fn() };

function makeService() {
  return new EstimationService(
    mockRepo as any,
    mockCocomoService as any,
    mockProjectsService as any,
    mockLlmService as any,
    mockTextNormalizer as any,
    mockSignalsService as any,
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
          hybridEffortPm: 37.5 * 1.1 * 1.0 * 0.9 * 1.1 * 0.7,
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
      mockCocomoService.computeNominalEffort.mockReturnValue({
        nominalEffortPm: 37.5,
        cocomoInputs: {},
      });
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
});
