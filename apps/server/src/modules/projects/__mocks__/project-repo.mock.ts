import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';

/**
 * Returns a jest-mocked Repository<Project> with jest.fn() stubs on every
 * method the service calls.  The return type is explicit so callers can drive
 * mockResolvedValue / mockReturnValue without casting to `any`.
 */
export function mockProjectRepo(): jest.Mocked<
  Pick<Repository<Project>, 'create' | 'save' | 'findAndCount' | 'findOneBy' | 'remove'>
> {
  return {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
    remove: jest.fn(),
  };
}
