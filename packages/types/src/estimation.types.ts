import type { Signal, SignalName } from './signals.types';

export type EstimationStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface CocomoInputs {
  scaleFactors: Record<string, number>;
  effortMultipliers: Record<string, number>;
  sizeKloc: number;
  eaf: number;
}

export interface AdjustmentResult {
  productOfFactors: number;
  hybridEffortPm: number;
  perSignalBreakdown: Array<{
    signalName: SignalName;
    ordinal: number;
    factor: number;
  }>;
}

export interface Estimation {
  id: string;
  projectId: string;
  runAt: string;
  status: EstimationStatus;
  cocomoInputs: Record<string, unknown> | null;
  nominalEffortPm: number | null;
  hybridEffortPm: number | null;
  errorMessage: string | null;
  signals: Signal[];
  adjustmentResult: AdjustmentResult | null;
}
