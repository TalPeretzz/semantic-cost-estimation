import { Injectable } from '@nestjs/common';
import {
  COCOMO_A,
  SCALE_EXPONENT_BASE,
  SCALE_EXPONENT_FACTOR,
  SCALE_FACTORS,
} from '@sce/constants';

@Injectable()
export class CocomoService {
  computeNominalEffort(
    sizeKloc: number,
    eaf: number,
  ): { nominalEffortPm: number; cocomoInputs: Record<string, unknown> } {
    const sumSF = Object.values(SCALE_FACTORS).reduce((sum, sf) => sum + sf.N, 0);
    const B = SCALE_EXPONENT_BASE + SCALE_EXPONENT_FACTOR * sumSF;
    const nominalEffortPm = COCOMO_A * Math.pow(sizeKloc, B) * eaf;

    const cocomoInputs: Record<string, unknown> = {
      A: COCOMO_A,
      B,
      sizeKloc,
      eaf,
      sumSF,
      scaleFactors: Object.fromEntries(
        Object.entries(SCALE_FACTORS).map(([k, v]) => [k, v.N]),
      ),
    };

    return { nominalEffortPm, cocomoInputs };
  }
}
