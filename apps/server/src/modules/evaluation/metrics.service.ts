import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  computeMAE(actual: number[], predicted: number[]): number {
    const n = actual.length;
    return actual.reduce((sum, a, i) => sum + Math.abs(a - predicted[i]), 0) / n;
  }

  computeRMSE(actual: number[], predicted: number[]): number {
    const n = actual.length;
    const mse = actual.reduce((sum, a, i) => sum + Math.pow(a - predicted[i], 2), 0) / n;
    return Math.sqrt(mse);
  }

  computeMAPE(actual: number[], predicted: number[]): number {
    const n = actual.length;
    return (
      (actual.reduce((sum, a, i) => sum + Math.abs((a - predicted[i]) / a), 0) / n) * 100
    );
  }
}
