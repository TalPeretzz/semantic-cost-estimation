import { NotFoundException } from '@nestjs/common';
import { EstimationController } from './estimation.controller';

const mockEstimation = {
  id: 'estimation-uuid',
  projectId: 'project-uuid',
  status: 'completed' as const,
  nominalEffortPm: 37.5,
  cocomoInputs: { A: 2.94, B: 1.097 },
  errorMessage: null,
};

const mockEstimationService = {
  runEstimation: jest.fn(),
  findByProject: jest.fn(),
  findOne: jest.fn(),
};

describe('EstimationController', () => {
  let controller: EstimationController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new EstimationController(mockEstimationService as any);
  });

  describe('run', () => {
    it('delegates to runEstimation with projectId', async () => {
      mockEstimationService.runEstimation.mockResolvedValue(mockEstimation);

      const result = await controller.run({ projectId: 'project-uuid' });

      expect(mockEstimationService.runEstimation).toHaveBeenCalledWith('project-uuid');
      expect(result).toEqual(mockEstimation);
    });

    it('propagates NotFoundException from service', async () => {
      mockEstimationService.runEstimation.mockRejectedValue(new NotFoundException());

      await expect(controller.run({ projectId: 'bad-uuid' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByProject', () => {
    it('delegates to findByProject with projectId from query', async () => {
      mockEstimationService.findByProject.mockResolvedValue([mockEstimation]);

      const result = await controller.findByProject({ projectId: 'project-uuid' });

      expect(mockEstimationService.findByProject).toHaveBeenCalledWith('project-uuid');
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('delegates to findOne with id param', async () => {
      mockEstimationService.findOne.mockResolvedValue(mockEstimation);

      const result = await controller.findOne('estimation-uuid');

      expect(mockEstimationService.findOne).toHaveBeenCalledWith('estimation-uuid');
      expect(result).toEqual(mockEstimation);
    });

    it('propagates NotFoundException from service', async () => {
      mockEstimationService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
