import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estimation } from './entities/estimation.entity';
import { CocomoService } from './cocomo.service';
import { EstimationService } from './estimation.service';
import { EstimationController } from './estimation.controller';
import { ProjectsModule } from '../projects/projects.module';
import { LlmModule } from '../llm/llm.module';
import { SignalsModule } from '../signals/signals.module';
import { AdjustmentModule } from '../adjustment/adjustment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Estimation]),
    ProjectsModule,
    LlmModule,
    SignalsModule,
    AdjustmentModule,
  ],
  controllers: [EstimationController],
  providers: [CocomoService, EstimationService],
  exports: [EstimationService],
})
export class EstimationModule {}
