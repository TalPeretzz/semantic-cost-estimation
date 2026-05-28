import { Injectable } from '@nestjs/common';
import {
  COCOMO_A,
  SCALE_EXPONENT_BASE,
  SCALE_EXPONENT_FACTOR,
  SCALE_FACTORS,
} from '@sce/constants';

const NOMINAL_SUM_SF = Object.values(SCALE_FACTORS).reduce((sum, sf) => sum + sf.N, 0);
const NOMINAL_B = SCALE_EXPONENT_BASE + SCALE_EXPONENT_FACTOR * NOMINAL_SUM_SF;

@Injectable()
export class CocomoService {
  computeNominalEffort(
    sizeKloc: number,
    eaf: number,
  ): { nominalEffortPm: number; cocomoInputs: Record<string, unknown> } {
    const nominalEffortPm = COCOMO_A * Math.pow(sizeKloc, NOMINAL_B) * eaf;

    const cocomoInputs: Record<string, unknown> = {
      A: COCOMO_A,
      B: NOMINAL_B,
      sizeKloc,
      eaf,
      sumSF: NOMINAL_SUM_SF,
      scaleFactors: Object.fromEntries(
        Object.entries(SCALE_FACTORS).map(([k, v]) => [k, v.N]),
      ),
    };

    return { nominalEffortPm, cocomoInputs };
  }
}
