import type { Signal, SignalName } from './signals.types';

export type EstimationStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface SignalComparison {
  claudeLevel: string;
  gptLevel: string;
  agreed: boolean;
}

export interface ValidationResult {
  gptModel: string;
  agreementRate: number;
  totalSignals: number;
  agreedSignals: number;
  perSignal: Record<string, SignalComparison>;
  runAt: string;
}

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
  actualEffortPm: number | null;
  normalizedText: string | null;
  validationResult: ValidationResult | null;
  errorMessage: string | null;
  signals: Signal[];
  adjustmentResult: AdjustmentResult | null;
}
