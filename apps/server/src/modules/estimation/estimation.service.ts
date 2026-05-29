import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estimation } from './entities/estimation.entity';
import { CocomoService } from './cocomo.service';
import { ProjectsService } from '../projects/projects.service';
import { LlmService } from '../llm/llm.service';
import { TextNormalizerService } from '../llm/text-normalizer.service';
import { SignalsService } from '../signals/signals.service';
import { AdjustmentService, AdjustmentResult } from '../adjustment/adjustment.service';
import { Signal } from '../signals/entities/signal.entity';
import { NOMINAL_EAF } from '@sce/constants';

export interface EstimationDetail extends Estimation {
  signals: Signal[];
  adjustmentResult: AdjustmentResult | null;
}

@Injectable()
export class EstimationService {
  constructor(
    @InjectRepository(Estimation)
    private readonly estimationRepo: Repository<Estimation>,
    private readonly cocomoService: CocomoService,
    private readonly projectsService: ProjectsService,
    private readonly llmService: LlmService,
    private readonly textNormalizer: TextNormalizerService,
    private readonly signalsService: SignalsService,
    private readonly adjustmentService: AdjustmentService,
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

      const normalizedText = this.textNormalizer.normalize({
        inputType: project.inputType,
        descriptionText: project.descriptionText,
        descriptionJson: project.descriptionJson as Record<string, string> | null,
      });

      const llmOutput = await this.llmService.extractSignals(normalizedText);
      const signals = await this.signalsService.createBulk(estimation.id, llmOutput);

      const { hybridEffortPm } = this.adjustmentService.compute(nominalEffortPm, signals);

      estimation.status = 'completed';
      estimation.nominalEffortPm = nominalEffortPm;
      estimation.hybridEffortPm = hybridEffortPm;
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

  async findOneWithDetail(id: string): Promise<EstimationDetail> {
    const estimation = await this.findOne(id);
    const signals = await this.signalsService.findByEstimation(id);

    const adjustmentResult =
      estimation.nominalEffortPm !== null && signals.length > 0
        ? this.adjustmentService.compute(estimation.nominalEffortPm, signals)
        : null;

    return { ...estimation, signals, adjustmentResult };
  }
}
