import { Injectable } from '@nestjs/common';
import { SIGNAL_ORDINALS, ORDINAL_FACTOR_BASE, ORDINAL_FACTOR_MULTIPLIER } from '@sce/constants';
import type { SignalLevel, OrdinalValue } from '@sce/types';

@Injectable()
export class OrdinalMappingService {
  toOrdinal(level: SignalLevel): OrdinalValue {
    return SIGNAL_ORDINALS[level] as OrdinalValue;
  }

  toFactor(ordinal: OrdinalValue): number {
    return ORDINAL_FACTOR_BASE + ordinal * ORDINAL_FACTOR_MULTIPLIER;
  }
}
