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
};

const mockEstimation = {
  id: 'estimation-uuid',
  projectId: 'project-uuid',
  status: 'running' as const,
  nominalEffortPm: null,
  cocomoInputs: null,
  errorMessage: null,
};

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
};

const mockProjectsService = {
  findOne: jest.fn(),
};

const mockCocomoService = {
  computeNominalEffort: jest.fn(),
};

describe('EstimationService', () => {
  let service: EstimationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EstimationService(
      mockRepo as any,
      mockCocomoService as any,
      mockProjectsService as any,
    );
  });

  describe('runEstimation', () => {
    it('creates a completed estimation for a valid project', async () => {
      mockProjectsService.findOne.mockResolvedValue(mockProject);
      mockRepo.create.mockReturnValue({ ...mockEstimation });
      mockRepo.save
        .mockResolvedValueOnce({ ...mockEstimation })
        .mockResolvedValueOnce({ ...mockEstimation, status: 'completed', nominalEffortPm: 37.5 });
      mockCocomoService.computeNominalEffort.mockReturnValue({
        nominalEffortPm: 37.5,
        cocomoInputs: { A: 2.94, B: 1.097 },
      });

      const result = await service.runEstimation('project-uuid');

      expect(mockRepo.create).toHaveBeenCalledWith({ projectId: 'project-uuid', status: 'running' });
      expect(mockCocomoService.computeNominalEffort).toHaveBeenCalledWith(10, 1.0);
      expect(result.status).toBe('completed');
      expect(result.nominalEffortPm).toBe(37.5);
    });

    it('throws NotFoundException when project does not exist', async () => {
      mockProjectsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.runEstimation('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when findOne returns null', async () => {
      mockProjectsService.findOne.mockResolvedValue(null);

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

      const result = await service.runEstimation('project-uuid');
      expect(result.status).toBe('failed');
    });
  });

  describe('findByProject', () => {
    it('returns estimations ordered by runAt DESC', async () => {
      mockRepo.find.mockResolvedValue([mockEstimation]);
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
      const result = await service.findOne('estimation-uuid');
      expect(result).toEqual(mockEstimation);
    });

    it('throws NotFoundException when estimation does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
