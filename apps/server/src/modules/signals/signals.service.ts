import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Signal } from './entities/signal.entity';
import { OrdinalMappingService } from './ordinal-mapping.service';
import { LlmOutput } from '../llm/schemas/llm-output.schema';
import { SIGNAL_NAMES } from '@sce/constants';

@Injectable()
export class SignalsService {
  constructor(
    @InjectRepository(Signal)
    private readonly signalRepo: Repository<Signal>,
    private readonly ordinalMapping: OrdinalMappingService,
  ) {}

  async createBulk(estimationId: string, llmOutput: LlmOutput): Promise<Signal[]> {
    const entities = SIGNAL_NAMES.map((name) => {
      const { level, rationale } = llmOutput[name];
      const ordinal = this.ordinalMapping.toOrdinal(level);
      const adjustmentFactor = this.ordinalMapping.toFactor(ordinal);

      return this.signalRepo.create({
        estimationId,
        signalName: name,
        rawLevel: level,
        ordinal,
        adjustmentFactor,
        llmRationale: rationale,
      });
    });

    return this.signalRepo.save(entities);
  }

  async findByEstimation(estimationId: string): Promise<Signal[]> {
    return this.signalRepo.find({ where: { estimationId } });
  }

  async getDistribution(): Promise<{ signalName: string; level: string; count: number }[]> {
    const rows = await this.signalRepo
      .createQueryBuilder('signal')
      .select('signal.signalName', 'signalName')
      .addSelect('signal.rawLevel', 'level')
      .addSelect('COUNT(*)', 'count')
      .groupBy('signal.signalName')
      .addGroupBy('signal.rawLevel')
      .getRawMany<{ signalName: string; level: string; count: string }>();
    return rows.map((r) => ({ ...r, count: Number(r.count) }));
  }
}
