export type SignalName =
  | 'functional_complexity'
  | 'architectural_complexity'
  | 'external_integrations'
  | 'requirement_stability'
  | 'uncertainty';

export type SignalLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
export type OrdinalValue = -3 | -1 | 0 | 1 | 3;

export interface Signal {
  id: string;
  estimationId: string;
  signalName: SignalName;
  rawLevel: SignalLevel;
  ordinal: OrdinalValue;
  llmRationale: string;
  adjustmentFactor: number;
  createdAt: string;
}

export interface LlmSignalPayload {
  functional_complexity: { level: SignalLevel; rationale: string };
  architectural_complexity: { level: SignalLevel; rationale: string };
  external_integrations: { level: SignalLevel; rationale: string };
  requirement_stability: { level: SignalLevel; rationale: string };
  uncertainty: { level: SignalLevel; rationale: string };
}
