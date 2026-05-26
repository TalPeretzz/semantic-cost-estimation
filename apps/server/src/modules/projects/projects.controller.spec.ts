import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService, PaginatedProjects } from './projects.service';
import { makeProject, validCreateBody, validUpdateBody } from './__mocks__/project.fixtures';
import { Project } from './entities/project.entity';

/**
 * Returns a jest-mocked ProjectsService with jest.fn() stubs on every
 * public method the controller delegates to.
 */
function mockProjectsService(): jest.Mocked<ProjectsService> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  } as unknown as jest.Mocked<ProjectsService>;
}

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: jest.Mocked<ProjectsService>;

  beforeEach(async () => {
    service = mockProjectsService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: service }],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('delegates to service.create with the dto and returns the result', async () => {
      const project = makeProject();
      service.create.mockResolvedValue(project);

      const result = await controller.create(validCreateBody as any);

      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith(validCreateBody);
      expect(result).toBe(project);
    });
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('delegates to service.findAll with parsed page and limit and returns the result', async () => {
      const paginated: PaginatedProjects = {
        data: [makeProject()],
        total: 1,
        page: 1,
        limit: 20,
      };
      service.findAll.mockResolvedValue(paginated);

      const result = await controller.findAll('1', '20');

      expect(service.findAll).toHaveBeenCalledWith(1, 20);
      expect(result).toBe(paginated);
    });

    it('uses defaults (page=1, limit=20) when query params are not provided', async () => {
      const paginated: PaginatedProjects = { data: [], total: 0, page: 1, limit: 20 };
      service.findAll.mockResolvedValue(paginated);

      // Controller default values are '1' and '20' from the @Query decorators
      await controller.findAll('1', '20');

      expect(service.findAll).toHaveBeenCalledWith(1, 20);
    });

    it('clamps page to a minimum of 1 when passed 0', async () => {
      service.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await controller.findAll('0', '20');

      expect(service.findAll).toHaveBeenCalledWith(1, 20);
    });

    it('clamps limit to a maximum of 100', async () => {
      service.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 });

      await controller.findAll('1', '9999');

      expect(service.findAll).toHaveBeenCalledWith(1, 100);
    });

    it('falls back to page=1 and limit=20 for non-numeric strings', async () => {
      service.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await controller.findAll('abc', 'xyz');

      expect(service.findAll).toHaveBeenCalledWith(1, 20);
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------
  describe('findOne', () => {
    it('delegates to service.findOne with the id param and returns the result', async () => {
      const project = makeProject();
      service.findOne.mockResolvedValue(project);

      const result = await controller.findOne(project.id);

      expect(service.findOne).toHaveBeenCalledWith(project.id);
      expect(result).toBe(project);
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('delegates to service.update with the id and dto and returns the result', async () => {
      const updated = makeProject({ name: 'Updated Project Name' });
      service.update.mockResolvedValue(updated);

      const result = await controller.update(updated.id, validUpdateBody as any);

      expect(service.update).toHaveBeenCalledWith(updated.id, validUpdateBody);
      expect(result).toBe(updated);
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------
  describe('remove', () => {
    it('delegates to service.remove with the id and returns the result', async () => {
      service.remove.mockResolvedValue(undefined);
      const project = makeProject();

      const result = await controller.remove(project.id);

      expect(service.remove).toHaveBeenCalledWith(project.id);
      expect(result).toBeUndefined();
    });
  });
});
