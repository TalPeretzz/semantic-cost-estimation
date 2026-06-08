import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluationRun } from './entities/evaluation-run.entity';
import { EvaluationService } from './evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { MetricsService } from './metrics.service';
import { ProjectsModule } from '../projects/projects.module';
import { EstimationModule } from '../estimation/estimation.module';

@Module({
  imports: [TypeOrmModule.forFeature([EvaluationRun]), ProjectsModule, EstimationModule],
  controllers: [EvaluationController],
  providers: [EvaluationService, MetricsService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
