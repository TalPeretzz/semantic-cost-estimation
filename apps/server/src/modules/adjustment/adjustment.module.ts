import { Module } from '@nestjs/common';
import { AdjustmentService } from './adjustment.service';

@Module({
  providers: [AdjustmentService],
  exports: [AdjustmentService],
})
export class AdjustmentModule {}
