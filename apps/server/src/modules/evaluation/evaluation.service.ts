import { Injectable, UnprocessableEntityException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluationRun } from './entities/evaluation-run.entity';
import { MetricsService } from './metrics.service';
import { ProjectsService } from '../projects/projects.service';
import { EstimationService } from '../estimation/estimation.service';
import { RunEvaluationDto } from './dto/run-evaluation.dto';
import type { PerProjectEvaluationRow } from '@sce/types';

export interface EvaluationDetail extends EvaluationRun {
  perProjectRows: PerProjectEvaluationRow[];
}

@Injectable()
export class EvaluationService {
  constructor(
    @InjectRepository(EvaluationRun)
    private readonly evalRepo: Repository<EvaluationRun>,
    private readonly metricsService: MetricsService,
    private readonly projectsService: ProjectsService,
    private readonly estimationService: EstimationService,
  ) {}

  async runEvaluation(dto: RunEvaluationDto): Promise<EvaluationDetail> {
    const projects = await Promise.all(
      dto.projectIds.map((id) => this.projectsService.findOne(id)),
    );

    const missingActual = projects.filter((p) => p.actualEffortPm == null);
    if (missingActual.length > 0) {
      throw new UnprocessableEntityException(
        `Projects missing actualEffortPm: ${missingActual.map((p) => p.id).join(', ')}`,
      );
    }

    const rows: PerProjectEvaluationRow[] = [];

    for (const project of projects) {
      const estimations = await this.estimationService.findByProject(project.id);
      const latest = estimations.find(
        (e) => e.status === 'completed' && e.nominalEffortPm != null && e.hybridEffortPm != null,
      );

      if (!latest) {
        throw new UnprocessableEntityException(
          `Project "${project.name}" (${project.id}) has no completed estimation`,
        );
      }

      const baselineAbs = Math.abs(project.actualEffortPm! - latest.nominalEffortPm!);
      const hybridAbs = Math.abs(project.actualEffortPm! - latest.hybridEffortPm!);

      rows.push({
        projectId: project.id,
        projectName: project.name,
        actualEffortPm: project.actualEffortPm!,
        baselineEffortPm: latest.nominalEffortPm!,
        hybridEffortPm: latest.hybridEffortPm!,
        baselineAbsoluteError: baselineAbs,
        hybridAbsoluteError: hybridAbs,
      });
    }

    const actual = rows.map((r) => r.actualEffortPm);
    const baseline = rows.map((r) => r.baselineEffortPm);
    const hybrid = rows.map((r) => r.hybridEffortPm);

    const run = this.evalRepo.create({
      name: dto.name,
      sampleSize: rows.length,
      projectIds: dto.projectIds,
      baselineMae: this.metricsService.computeMAE(actual, baseline),
      baselineRmse: this.metricsService.computeRMSE(actual, baseline),
      baselineMape: this.metricsService.computeMAPE(actual, baseline),
      hybridMae: this.metricsService.computeMAE(actual, hybrid),
      hybridRmse: this.metricsService.computeRMSE(actual, hybrid),
      hybridMape: this.metricsService.computeMAPE(actual, hybrid),
    });

    const saved = await this.evalRepo.save(run);
    return { ...saved, perProjectRows: rows };
  }

  async findAll(): Promise<EvaluationRun[]> {
    return this.evalRepo.find({ order: { runAt: 'DESC' } });
  }

  async findOne(id: string): Promise<EvaluationDetail> {
    const run = await this.evalRepo.findOne({ where: { id } });
    if (!run) throw new NotFoundException(`EvaluationRun ${id} not found`);

    const projects = await Promise.all(
      run.projectIds.map((pid) => this.projectsService.findOne(pid)),
    );

    const rows: PerProjectEvaluationRow[] = [];

    for (const project of projects) {
      const estimations = await this.estimationService.findByProject(project.id);
      const latest = estimations.find(
        (e) => e.status === 'completed' && e.nominalEffortPm != null && e.hybridEffortPm != null,
      );
      if (!latest || project.actualEffortPm == null) continue;

      rows.push({
        projectId: project.id,
        projectName: project.name,
        actualEffortPm: project.actualEffortPm,
        baselineEffortPm: latest.nominalEffortPm!,
        hybridEffortPm: latest.hybridEffortPm!,
        baselineAbsoluteError: Math.abs(project.actualEffortPm - latest.nominalEffortPm!),
        hybridAbsoluteError: Math.abs(project.actualEffortPm - latest.hybridEffortPm!),
      });
    }

    return { ...run, perProjectRows: rows };
  }
}
