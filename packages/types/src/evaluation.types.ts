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
  baselineMae: number;
  baselineRmse: number;
  baselineMape: number;
  hybridMae: number;
  hybridRmse: number;
  hybridMape: number;
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
