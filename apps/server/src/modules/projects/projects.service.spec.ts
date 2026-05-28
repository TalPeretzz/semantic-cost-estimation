import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { mockProjectRepo } from './__mocks__/project-repo.mock';
import { makeProject, validCreateBody, validUpdateBody } from './__mocks__/project.fixtures';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let repo: ReturnType<typeof mockProjectRepo>;

  beforeEach(async () => {
    repo = mockProjectRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('calls repo.create with the mapped fields and returns the saved entity', async () => {
      const built = makeProject();
      const saved = makeProject({ id: 'saved-uuid' });

      repo.create.mockReturnValue(built);
      repo.save.mockResolvedValue(saved);

      const result = await service.create(validCreateBody as any);

      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: validCreateBody.name,
          inputType: validCreateBody.inputType,
          descriptionText: validCreateBody.descriptionText,
          descriptionJson: null, // freetext → descriptionJson forced null
        }),
      );
      expect(repo.save).toHaveBeenCalledWith(built);
      expect(result).toBe(saved);
    });

    it('sets descriptionText to null and descriptionJson to the provided value for structured inputType', async () => {
      const structuredPayload = {
        name: 'Structured Project',
        inputType: 'structured' as const,
        descriptionJson: { overview: 'some description' },
        domain: 'organic' as const,
        sizeKloc: 5,
        teamSize: 3,
        experienceLevel: 'nominal' as const,
      };
      const built = makeProject({ inputType: 'structured', descriptionText: null, descriptionJson: { overview: 'some description' } });
      const saved = makeProject({ inputType: 'structured' });

      repo.create.mockReturnValue(built);
      repo.save.mockResolvedValue(saved);

      await service.create(structuredPayload as any);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          descriptionText: null,
          descriptionJson: { overview: 'some description' },
        }),
      );
    });

    it('maps actualEffortPm to null when not provided', async () => {
      const payload = { ...validCreateBody, actualEffortPm: undefined };
      const built = makeProject();
      repo.create.mockReturnValue(built);
      repo.save.mockResolvedValue(built);

      await service.create(payload as any);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ actualEffortPm: null }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('calls findAndCount with correct skip/take for page 1 and returns paginated shape', async () => {
      const projects = [makeProject(), makeProject({ id: 'second-id' })];
      repo.findAndCount.mockResolvedValue([projects, 2]);

      const result = await service.findAll(1, 20);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(result).toEqual({ data: projects, total: 2, page: 1, limit: 20 });
    });

    it('computes correct skip for page 2', async () => {
      repo.findAndCount.mockResolvedValue([[], 50]);

      await service.findAll(2, 10);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('returns empty data array when no projects exist', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(1, 20);

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    });

    it('passes page and limit through to the response shape unchanged', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(3, 5);

      expect(result.page).toBe(3);
      expect(result.limit).toBe(5);
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------
  describe('findOne', () => {
    it('returns the project when findOneBy resolves an entity', async () => {
      const project = makeProject();
      repo.findOneBy.mockResolvedValue(project);

      const result = await service.findOne(project.id);

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: project.id });
      expect(result).toBe(project);
    });

    it('throws NotFoundException when findOneBy returns null', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('NotFoundException message includes the missing id', async () => {
      repo.findOneBy.mockResolvedValue(null);
      const missingId = 'deadbeef-0000-0000-0000-000000000000';

      await expect(service.findOne(missingId)).rejects.toThrow(
        `Project with id "${missingId}" not found`,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('merges dto fields onto the found entity and saves it', async () => {
      const existing = makeProject();
      const savedResult = makeProject({ name: 'Updated Project Name' });

      repo.findOneBy.mockResolvedValue(existing);
      repo.save.mockResolvedValue(savedResult);

      const result = await service.update(existing.id, validUpdateBody as any);

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: existing.id });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Project Name' }),
      );
      expect(result).toBe(savedResult);
    });

    it('does not overwrite fields omitted from the dto', async () => {
      const existing = makeProject({ teamSize: 10 });
      repo.findOneBy.mockResolvedValue(existing);
      repo.save.mockResolvedValue(existing);

      await service.update(existing.id, { name: 'Only Name Changed' } as any);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ teamSize: 10 }),
      );
    });

    it('switches descriptionText and nulls descriptionJson when inputType changes to freetext', async () => {
      const existing = makeProject({
        inputType: 'structured',
        descriptionJson: { overview: 'old' },
        descriptionText: null,
      });
      const updateDto = {
        inputType: 'freetext' as const,
        descriptionText: 'new free text',
      };

      repo.findOneBy.mockResolvedValue(existing);
      repo.save.mockResolvedValue(makeProject());

      await service.update(existing.id, updateDto as any);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          inputType: 'freetext',
          descriptionText: 'new free text',
          descriptionJson: null,
        }),
      );
    });

    it('switches descriptionJson and nulls descriptionText when inputType changes to structured', async () => {
      const existing = makeProject({
        inputType: 'freetext',
        descriptionText: 'old text',
        descriptionJson: null,
      });
      const updateDto = {
        inputType: 'structured' as const,
        descriptionJson: { feature: 'new structured data' },
      };

      repo.findOneBy.mockResolvedValue(existing);
      repo.save.mockResolvedValue(makeProject());

      await service.update(existing.id, updateDto as any);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          inputType: 'structured',
          descriptionJson: { feature: 'new structured data' },
          descriptionText: null,
        }),
      );
    });

    it('throws NotFoundException when the target id does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', validUpdateBody as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------
  describe('remove', () => {
    it('calls findOneBy then repo.remove with the found entity', async () => {
      const project = makeProject();
      repo.findOneBy.mockResolvedValue(project);
      repo.remove.mockResolvedValue(project);

      await service.remove(project.id);

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: project.id });
      expect(repo.remove).toHaveBeenCalledWith(project);
    });

    it('returns void (undefined) on success', async () => {
      const project = makeProject();
      repo.findOneBy.mockResolvedValue(project);
      repo.remove.mockResolvedValue(project);

      const result = await service.remove(project.id);

      expect(result).toBeUndefined();
    });

    it('throws NotFoundException when the target id does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
