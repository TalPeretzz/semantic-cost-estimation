import type { OrdinalValue } from '@sce/types';

export const SIGNAL_ORDINALS: Record<string, OrdinalValue> = {
  very_low: -3,
  low: -1,
  medium: 0,
  high: 1,
  very_high: 3,
};

// A_i = 1 + (ordinal × 0.1)
export const ORDINAL_FACTOR_BASE = 1;
export const ORDINAL_FACTOR_MULTIPLIER = 0.1;

export const SIGNAL_NAMES = [
  'functional_complexity',
  'architectural_complexity',
  'external_integrations',
  'requirement_stability',
  'uncertainty',
] as const;
