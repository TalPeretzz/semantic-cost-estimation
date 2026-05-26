import { Project } from '../entities/project.entity';

/**
 * Builds a fully-populated Project entity with sensible defaults.
 * Pass overrides to customise individual fields per test.
 */
export function makeProject(overrides: Partial<Project> = {}): Project {
  const project = new Project();
  project.id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  project.name = 'Test Project';
  project.inputType = 'freetext';
  project.descriptionText = 'A free-text description for the test project.';
  project.descriptionJson = null;
  project.domain = 'organic';
  project.sizeKloc = 10;
  project.teamSize = 5;
  project.experienceLevel = 'nominal';
  project.actualEffortPm = null;
  project.createdAt = new Date('2024-01-01T00:00:00.000Z');
  project.updatedAt = new Date('2024-01-01T00:00:00.000Z');
  return Object.assign(project, overrides);
}

/** Valid payload for CreateProjectDto (freetext variant). */
export const validCreateBody = {
  name: 'Test Project',
  inputType: 'freetext' as const,
  descriptionText: 'A free-text description for the test project.',
  domain: 'organic' as const,
  sizeKloc: 10,
  teamSize: 5,
  experienceLevel: 'nominal' as const,
  actualEffortPm: null,
};

/** Valid payload for UpdateProjectDto — partial, name-only update. */
export const validUpdateBody = {
  name: 'Updated Project Name',
};
