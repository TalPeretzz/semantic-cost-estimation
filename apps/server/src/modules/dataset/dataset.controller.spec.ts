import { BadRequestException } from '@nestjs/common';
import { DatasetController } from './dataset.controller';

const mockDatasetService = { importFromCsv: jest.fn() };

function makeController() {
  return new DatasetController(mockDatasetService as any);
}

describe('DatasetController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('import', () => {
    it('delegates to datasetService.importFromCsv with the file buffer', async () => {
      const buffer = Buffer.from('name,kloc\nProject A,10');
      const file = { buffer } as Express.Multer.File;
      const expected = { imported: 1, skipped: 0 };
      mockDatasetService.importFromCsv.mockResolvedValue(expected);

      const controller = makeController();
      const result = await controller.import(file);

      expect(mockDatasetService.importFromCsv).toHaveBeenCalledWith(buffer);
      expect(result).toEqual(expected);
    });

    it('throws BadRequestException when no file is provided', () => {
      const controller = makeController();
      expect(() => controller.import(undefined as any)).toThrow(BadRequestException);
      expect(mockDatasetService.importFromCsv).not.toHaveBeenCalled();
    });
  });
});
