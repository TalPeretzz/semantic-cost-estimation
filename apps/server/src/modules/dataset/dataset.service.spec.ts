import { DatasetService } from './dataset.service';

const mockProjectsService = { create: jest.fn() };

function makeService() {
  return new DatasetService(mockProjectsService as any);
}

const validCsv = Buffer.from(
  'name,description,domain,size_kloc,team_size,experience_level,actual_effort_pm\n' +
  'Project A,A payment system.,organic,10,5,nominal,95\n' +
  'Project B,An analytics platform.,semi-detached,25,8,high,200\n',
);

describe('DatasetService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('importFromCsv', () => {
    it('imports all valid rows and returns correct counts', async () => {
      mockProjectsService.create.mockResolvedValue({});

      const service = makeService();
      const result = await service.importFromCsv(validCsv);

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('skips rows with invalid domain and records error', async () => {
      const csv = Buffer.from(
        'name,description,domain,size_kloc,team_size,experience_level\n' +
        'Bad Project,desc,unknown_domain,5,3,nominal\n',
      );

      const service = makeService();
      const result = await service.importFromCsv(csv);

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors[0].message).toContain('invalid domain');
    });

    it('skips rows with missing name', async () => {
      const csv = Buffer.from(
        'name,description,domain,size_kloc,team_size,experience_level\n' +
        ',A description,organic,5,3,nominal\n',
      );

      const service = makeService();
      const result = await service.importFromCsv(csv);

      expect(result.skipped).toBe(1);
      expect(result.errors[0].message).toContain('missing name');
    });

    it('skips rows with size_kloc <= 0', async () => {
      const csv = Buffer.from(
        'name,description,domain,size_kloc,team_size,experience_level\n' +
        'P,desc,organic,0,3,nominal\n',
      );

      const service = makeService();
      const result = await service.importFromCsv(csv);

      expect(result.skipped).toBe(1);
      expect(result.errors[0].message).toContain('size_kloc');
    });

    it('skips rows with invalid experience_level', async () => {
      const csv = Buffer.from(
        'name,description,domain,size_kloc,team_size,experience_level\n' +
        'P,desc,organic,5,3,expert\n',
      );

      const service = makeService();
      const result = await service.importFromCsv(csv);

      expect(result.skipped).toBe(1);
      expect(result.errors[0].message).toContain('experience_level');
    });

    it('imports row without actual_effort_pm (optional field)', async () => {
      mockProjectsService.create.mockResolvedValue({});
      const csv = Buffer.from(
        'name,description,domain,size_kloc,team_size,experience_level\n' +
        'P,desc,organic,5,3,nominal\n',
      );

      const service = makeService();
      const result = await service.importFromCsv(csv);

      expect(result.imported).toBe(1);
    });

    it('mixes valid and invalid rows correctly', async () => {
      mockProjectsService.create.mockResolvedValue({});
      const csv = Buffer.from(
        'name,description,domain,size_kloc,team_size,experience_level\n' +
        'Good,desc,organic,5,3,nominal\n' +
        ',desc,organic,5,3,nominal\n' +
        'Good2,desc,embedded,10,4,high\n',
      );

      const service = makeService();
      const result = await service.importFromCsv(csv);

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(1);
    });

    it('returns zero imports for a CSV with only a header row and no data', async () => {
      const csv = Buffer.from('name,description,domain,size_kloc,team_size,experience_level\n');
      const service = makeService();
      const result = await service.importFromCsv(csv);
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(0);
    });
  });

  describe('validateRow', () => {
    it('returns null for a fully valid row', () => {
      const service = makeService();
      expect(
        service.validateRow(
          { name: 'P', description: 'desc', domain: 'organic', size_kloc: '5', team_size: '3', experience_level: 'nominal' },
          2,
        ),
      ).toBeNull();
    });

    it('returns error for team_size out of range', () => {
      const service = makeService();
      const err = service.validateRow(
        { name: 'P', description: 'd', domain: 'organic', size_kloc: '5', team_size: '999', experience_level: 'nominal' },
        2,
      );
      expect(err).toContain('team_size');
    });
  });
});
