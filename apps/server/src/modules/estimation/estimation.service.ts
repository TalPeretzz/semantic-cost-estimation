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
import { GptValidationService } from '../llm/gpt-validation.service';
import { Signal } from '../signals/entities/signal.entity';
import { NOMINAL_EAF } from '@sce/constants';

export interface EstimationDetail extends Estimation {
  signals: Signal[];
  adjustmentResult: AdjustmentResult | null;
  actualEffortPm: number | null;
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
    private readonly gptValidation: GptValidationService,
  ) {}

  async runEstimation(projectId: string): Promise<Estimation> {
    const project = await this.projectsService.findOne(projectId);

    const estimation = this.estimationRepo.create({ projectId, status: 'running' });
    await this.estimationRepo.save(estimation);

    try {
      const normalizedText = this.textNormalizer.normalize({
        inputType: project.inputType,
        descriptionText: project.descriptionText,
        descriptionJson: project.descriptionJson as Record<string, string> | null,
      });

      estimation.normalizedText = normalizedText;
      const llmOutput = await this.llmService.extractSignals(normalizedText);

      const { nominalEffortPm, cocomoInputs } = this.cocomoService.computeNominalEffort(
        project.sizeKloc,
        NOMINAL_EAF,
        {
          precedentedness:         llmOutput.precedentedness,
          development_flexibility: llmOutput.development_flexibility,
          architecture_risk:       llmOutput.architecture_risk,
          team_cohesion:           llmOutput.team_cohesion,
          process_maturity:        llmOutput.process_maturity,
        },
      );

      const [signals, validationResult] = await Promise.all([
        this.signalsService.createBulk(estimation.id, llmOutput),
        this.gptValidation.validate(normalizedText, llmOutput),
      ]);
      const { hybridEffortPm } = this.adjustmentService.compute(nominalEffortPm, signals);

      estimation.validationResult = validationResult as Record<string, unknown> | null;
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
    const [signals, project] = await Promise.all([
      this.signalsService.findByEstimation(id),
      this.projectsService.findOne(estimation.projectId),
    ]);

    const adjustmentResult =
      estimation.nominalEffortPm !== null && signals.length > 0
        ? this.adjustmentService.compute(estimation.nominalEffortPm, signals)
        : null;

    return {
      ...estimation,
      signals,
      adjustmentResult,
      actualEffortPm: project.actualEffortPm ?? null,
    };
  }
}
