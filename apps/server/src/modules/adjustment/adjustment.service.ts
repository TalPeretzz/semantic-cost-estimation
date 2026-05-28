import { Injectable } from '@nestjs/common';
import { Signal } from '../signals/entities/signal.entity';

export interface AdjustmentResult {
  productOfFactors: number;
  hybridEffortPm: number;
  perSignalBreakdown: Array<{
    signalName: string;
    ordinal: number;
    factor: number;
  }>;
}

@Injectable()
export class AdjustmentService {
  compute(nominalEffortPm: number, signals: Signal[]): AdjustmentResult {
    const perSignalBreakdown = signals.map((s) => ({
      signalName: s.signalName,
      ordinal: s.ordinal,
      factor: s.adjustmentFactor,
    }));

    const productOfFactors = signals.reduce((p, s) => p * s.adjustmentFactor, 1);
    const hybridEffortPm = nominalEffortPm * productOfFactors;

    return { productOfFactors, hybridEffortPm, perSignalBreakdown };
  }
}
