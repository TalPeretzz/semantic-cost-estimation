import { EvaluationController } from './evaluation.controller';
import { RunEvaluationDto } from './dto/run-evaluation.dto';

const mockEvaluationService = {
  runEvaluation: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
};

function makeController() {
  return new EvaluationController(mockEvaluationService as any);
}

const mockRun = {
  id: 'run-uuid',
  name: 'Test Run',
  projectIds: ['p1', 'p2'],
  mape: 0.33,
  createdAt: new Date().toISOString(),
};

describe('EvaluationController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('run', () => {
    it('delegates to evaluationService.runEvaluation and returns the result', async () => {
      const dto: RunEvaluationDto = { name: 'Test Run', projectIds: ['p1', 'p2'] };
      mockEvaluationService.runEvaluation.mockResolvedValue(mockRun);

      const controller = makeController();
      const result = await controller.run(dto);

      expect(mockEvaluationService.runEvaluation).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockRun);
    });
  });

  describe('findAll', () => {
    it('delegates to evaluationService.findAll and returns the list', async () => {
      mockEvaluationService.findAll.mockResolvedValue([mockRun]);

      const controller = makeController();
      const result = await controller.findAll();

      expect(mockEvaluationService.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockRun]);
    });

    it('returns empty array when no evaluation runs exist', async () => {
      mockEvaluationService.findAll.mockResolvedValue([]);

      const controller = makeController();
      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('delegates to evaluationService.findOne with the given id', async () => {
      mockEvaluationService.findOne.mockResolvedValue(mockRun);

      const controller = makeController();
      const result = await controller.findOne('run-uuid');

      expect(mockEvaluationService.findOne).toHaveBeenCalledWith('run-uuid');
      expect(result).toEqual(mockRun);
    });

    it('propagates errors from evaluationService.findOne', async () => {
      mockEvaluationService.findOne.mockRejectedValue(new Error('not found'));

      const controller = makeController();
      await expect(controller.findOne('bad-id')).rejects.toThrow('not found');
    });
  });
});
