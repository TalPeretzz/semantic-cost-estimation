import { UnprocessableEntityException, NotFoundException } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { MetricsService } from './metrics.service';

const metricsService = new MetricsService();

function makeProject(overrides: Partial<any> = {}) {
  return {
    id: 'proj-1',
    name: 'Project A',
    actualEffortPm: 100,
    ...overrides,
  };
}

function makeEstimation(overrides: Partial<any> = {}) {
  return {
    id: 'est-1',
    status: 'completed',
    nominalEffortPm: 110,
    hybridEffortPm: 95,
    ...overrides,
  };
}

const mockEvalRepo = { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn() };
const mockProjectsService = { findOne: jest.fn() };
const mockEstimationService = { findByProject: jest.fn() };

function makeService() {
  return new EvaluationService(
    mockEvalRepo as any,
    metricsService,
    mockProjectsService as any,
    mockEstimationService as any,
  );
}

describe('EvaluationService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('runEvaluation', () => {
    it('computes metrics and persists EvaluationRun for valid projects', async () => {
      const projects = [
        makeProject({ id: 'p1', actualEffortPm: 100 }),
        makeProject({ id: 'p2', actualEffortPm: 200 }),
      ];
      mockProjectsService.findOne
        .mockResolvedValueOnce(projects[0])
        .mockResolvedValueOnce(projects[1]);
      mockEstimationService.findByProject
        .mockResolvedValueOnce([makeEstimation({ nominalEffortPm: 110, hybridEffortPm: 95 })])
        .mockResolvedValueOnce([makeEstimation({ nominalEffortPm: 190, hybridEffortPm: 210 })]);

      const saved = { id: 'eval-1', name: 'Test Run', sampleSize: 2 };
      mockEvalRepo.create.mockReturnValue(saved);
      mockEvalRepo.save.mockResolvedValue(saved);

      const service = makeService();
      const result = await service.runEvaluation({ name: 'Test Run', projectIds: ['p1', 'p2'] });

      expect(mockEvalRepo.save).toHaveBeenCalledTimes(1);
      expect(result.perProjectRows).toHaveLength(2);
      expect(result.perProjectRows[0].baselineAbsoluteError).toBeCloseTo(10, 5);
      expect(result.perProjectRows[0].hybridAbsoluteError).toBeCloseTo(5, 5);
    });

    it('throws UnprocessableEntityException when a project has no actualEffortPm', async () => {
      mockProjectsService.findOne.mockResolvedValue(makeProject({ actualEffortPm: null }));

      const service = makeService();
      await expect(
        service.runEvaluation({ name: 'Run', projectIds: ['p1'] }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException when a project has no completed estimation', async () => {
      mockProjectsService.findOne.mockResolvedValue(makeProject());
      mockEstimationService.findByProject.mockResolvedValue([
        makeEstimation({ status: 'failed', nominalEffortPm: null }),
      ]);

      const service = makeService();
      await expect(
        service.runEvaluation({ name: 'Run', projectIds: ['p1'] }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('findAll', () => {
    it('returns evaluation runs ordered by runAt DESC', async () => {
      const runs = [{ id: 'e1' }, { id: 'e2' }];
      mockEvalRepo.find.mockResolvedValue(runs);

      const service = makeService();
      const result = await service.findAll();

      expect(mockEvalRepo.find).toHaveBeenCalledWith({ order: { runAt: 'DESC' } });
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('returns evaluation detail with perProjectRows', async () => {
      const run = { id: 'eval-1', projectIds: ['p1'] };
      mockEvalRepo.findOne.mockResolvedValue(run);
      mockProjectsService.findOne.mockResolvedValue(makeProject({ id: 'p1' }));
      mockEstimationService.findByProject.mockResolvedValue([makeEstimation()]);

      const service = makeService();
      const result = await service.findOne('eval-1');

      expect(result.perProjectRows).toHaveLength(1);
    });

    it('throws NotFoundException for unknown id', async () => {
      mockEvalRepo.findOne.mockResolvedValue(null);

      const service = makeService();
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
