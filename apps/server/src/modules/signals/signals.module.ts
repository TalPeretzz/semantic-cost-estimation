import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Signal } from './entities/signal.entity';
import { SignalsService } from './signals.service';
import { OrdinalMappingService } from './ordinal-mapping.service';

@Module({
  imports: [TypeOrmModule.forFeature([Signal])],
  providers: [SignalsService, OrdinalMappingService],
  exports: [SignalsService, OrdinalMappingService],
})
export class SignalsModule {}
