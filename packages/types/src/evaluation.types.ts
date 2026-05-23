export interface ErrorMetrics {
  mae: number;
  rmse: number;
  mape: number;
}

export interface EvaluationRun {
  id: string;
  name: string;
  runAt: string;
  sampleSize: number;
  projectIds: string[];
  baseline: ErrorMetrics;
  hybrid: ErrorMetrics;
}

export interface PerProjectEvaluationRow {
  projectId: string;
  projectName: string;
  actualEffortPm: number;
  baselineEffortPm: number;
  hybridEffortPm: number;
  baselineAbsoluteError: number;
  hybridAbsoluteError: number;
}
