import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estimation } from './entities/estimation.entity';
import { CocomoService } from './cocomo.service';
import { EstimationService } from './estimation.service';
import { EstimationController } from './estimation.controller';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [TypeOrmModule.forFeature([Estimation]), ProjectsModule],
  controllers: [EstimationController],
  providers: [CocomoService, EstimationService],
  exports: [EstimationService],
})
export class EstimationModule {}
