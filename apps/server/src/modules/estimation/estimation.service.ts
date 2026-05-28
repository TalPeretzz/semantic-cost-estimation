import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estimation } from './entities/estimation.entity';
import { CocomoService } from './cocomo.service';
import { ProjectsService } from '../projects/projects.service';
import { NOMINAL_EAF } from '@sce/constants';

@Injectable()
export class EstimationService {
  constructor(
    @InjectRepository(Estimation)
    private readonly estimationRepo: Repository<Estimation>,
    private readonly cocomoService: CocomoService,
    private readonly projectsService: ProjectsService,
  ) {}

  async runEstimation(projectId: string): Promise<Estimation> {
    const project = await this.projectsService.findOne(projectId);

    const estimation = this.estimationRepo.create({ projectId, status: 'running' });
    await this.estimationRepo.save(estimation);

    try {
      const { nominalEffortPm, cocomoInputs } = this.cocomoService.computeNominalEffort(
        project.sizeKloc,
        NOMINAL_EAF,
      );
      estimation.status = 'completed';
      estimation.nominalEffortPm = nominalEffortPm;
      estimation.cocomoInputs = cocomoInputs;
    } catch (err) {
      estimation.status = 'failed';
      estimation.errorMessage = err instanceof Error ? err.message : String(err);
    }

    return this.estimationRepo.save(estimation);
  }

  async findByProject(projectId: string): Promise<Estimation[]> {
    return this.estimationRepo.find({
      where: { projectId },
      order: { runAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Estimation> {
    const estimation = await this.estimationRepo.findOne({ where: { id } });
    if (!estimation) {
      throw new NotFoundException(`Estimation ${id} not found`);
    }
    return estimation;
  }
}
