import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

export interface PaginatedProjects {
  data: Project[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
  ) {}

  async create(dto: CreateProjectDto): Promise<Project> {
    this.logger.debug(`Creating project: ${dto.name}`);

    const project = this.projectsRepository.create({
      name: dto.name,
      inputType: dto.inputType,
      domain: dto.domain,
      sizeKloc: dto.sizeKloc,
      teamSize: dto.teamSize,
      experienceLevel: dto.experienceLevel,
      actualEffortPm: dto.actualEffortPm ?? null,
      descriptionText:
        dto.inputType === 'freetext' ? dto.descriptionText : null,
      descriptionJson:
        dto.inputType === 'structured' ? dto.descriptionJson : null,
    });

    const saved = await this.projectsRepository.save(project);
    this.logger.debug(`Project created with id: ${saved.id}`);
    return saved;
  }

  async findAll(page: number, limit: number): Promise<PaginatedProjects> {
    this.logger.debug(`Listing projects page=${page} limit=${limit}`);

    const [data, total] = await this.projectsRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Project> {
    this.logger.debug(`Finding project id=${id}`);

    const project = await this.projectsRepository.findOneBy({ id });
    if (!project) {
      throw new NotFoundException(`Project with id "${id}" not found`);
    }
    return project;
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    this.logger.debug(`Updating project id=${id}`);

    const project = await this.findOne(id);

    Object.assign(project, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.inputType !== undefined && { inputType: dto.inputType }),
      ...(dto.domain !== undefined && { domain: dto.domain }),
      ...(dto.sizeKloc !== undefined && { sizeKloc: dto.sizeKloc }),
      ...(dto.teamSize !== undefined && { teamSize: dto.teamSize }),
      ...(dto.experienceLevel !== undefined && {
        experienceLevel: dto.experienceLevel,
      }),
      ...(dto.actualEffortPm !== undefined && {
        actualEffortPm: dto.actualEffortPm,
      }),
      ...(dto.inputType === 'freetext' &&
        dto.descriptionText !== undefined && {
          descriptionText: dto.descriptionText,
          descriptionJson: null,
        }),
      ...(dto.inputType === 'structured' &&
        dto.descriptionJson !== undefined && {
          descriptionJson: dto.descriptionJson,
          descriptionText: null,
        }),
    });

    const saved = await this.projectsRepository.save(project);
    this.logger.debug(`Project updated id=${id}`);
    return saved;
  }

  async remove(id: string): Promise<void> {
    this.logger.debug(`Removing project id=${id}`);

    const project = await this.findOne(id);
    await this.projectsRepository.remove(project);
    this.logger.debug(`Project removed id=${id}`);
  }
}
