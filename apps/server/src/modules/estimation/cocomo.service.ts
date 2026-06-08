import { Injectable } from '@nestjs/common';
import {
  COCOMO_A,
  SCALE_EXPONENT_BASE,
  SCALE_EXPONENT_FACTOR,
  SCALE_FACTORS,
  LEVEL_TO_SF_KEY,
  SF_SIGNAL_TO_KEY,
} from '@sce/constants';

const NOMINAL_SUM_SF = Object.values(SCALE_FACTORS).reduce((sum, sf) => sum + sf.N, 0);
const NOMINAL_B = SCALE_EXPONENT_BASE + SCALE_EXPONENT_FACTOR * NOMINAL_SUM_SF;

// Flat lookup: SF_TABLE['PREC']['very_low'] → 6.20
const SF_TABLE: Record<string, Record<string, number>> = {
  PREC: { very_low: 6.20, low: 4.96, medium: 3.72, high: 2.48, very_high: 1.24 },
  FLEX: { very_low: 5.07, low: 4.05, medium: 3.04, high: 2.03, very_high: 1.01 },
  RESL: { very_low: 7.07, low: 5.65, medium: 4.24, high: 2.83, very_high: 1.41 },
  TEAM: { very_low: 5.48, low: 4.38, medium: 3.29, high: 2.19, very_high: 1.10 },
  PMAT: { very_low: 7.80, low: 6.24, medium: 4.68, high: 3.12, very_high: 1.56 },
};

export interface ScaleFactorEntry {
  level: string;
  rationale: string;
}

export interface ScaleFactorLevels {
  precedentedness: ScaleFactorEntry;
  development_flexibility: ScaleFactorEntry;
  architecture_risk: ScaleFactorEntry;
  team_cohesion: ScaleFactorEntry;
  process_maturity: ScaleFactorEntry;
}

export interface ScaleFactorAssessment {
  level: string;
  sfKey: string;
  sfValue: number;
  rationale: string;
}

@Injectable()
export class CocomoService {
  computeNominalEffort(
    sizeKloc: number,
    eaf: number,
    scaleFactorLevels?: ScaleFactorLevels,
  ): { nominalEffortPm: number; cocomoInputs: Record<string, unknown> } {
    let sumSF: number;
    let B: number;
    let resolvedScaleFactors: Record<string, number>;
    let scaleFactorAssessments: Record<string, ScaleFactorAssessment> | undefined;

    if (scaleFactorLevels) {
      scaleFactorAssessments = {};
      resolvedScaleFactors = {};

      for (const signalName of Object.keys(SF_SIGNAL_TO_KEY)) {
        const sfKey = SF_SIGNAL_TO_KEY[signalName as keyof typeof SF_SIGNAL_TO_KEY];
        const entry = scaleFactorLevels[signalName as keyof ScaleFactorLevels];
        const sfValue = SF_TABLE[sfKey][entry.level] ?? SF_TABLE[sfKey]['medium'];

        resolvedScaleFactors[sfKey] = sfValue;
        (scaleFactorAssessments as Record<string, ScaleFactorAssessment>)[signalName] = {
          level: entry.level,
          sfKey,
          sfValue,
          rationale: entry.rationale,
        };
      }

      sumSF = Object.values(resolvedScaleFactors).reduce((s, v) => s + v, 0);
      B = SCALE_EXPONENT_BASE + SCALE_EXPONENT_FACTOR * sumSF;
    } else {
      sumSF = NOMINAL_SUM_SF;
      B = NOMINAL_B;
      resolvedScaleFactors = Object.fromEntries(
        Object.entries(SCALE_FACTORS).map(([k, v]) => [k, v.N]),
      );
    }

    const nominalEffortPm = COCOMO_A * Math.pow(sizeKloc, B) * eaf;

    const cocomoInputs: Record<string, unknown> = {
      A: COCOMO_A,
      B,
      nominalB: NOMINAL_B,
      sizeKloc,
      eaf,
      sumSF,
      scaleFactors: resolvedScaleFactors,
      ...(scaleFactorAssessments && { scaleFactorAssessments }),
    };

    return { nominalEffortPm, cocomoInputs };
  }
}
