export const COCOMO_A = 2.94;

export const SCALE_FACTORS = {
  PREC: { VL: 6.20, L: 4.96, N: 3.72, H: 2.48, VH: 1.24, XH: 0.00 },
  FLEX: { VL: 5.07, L: 4.05, N: 3.04, H: 2.03, VH: 1.01, XH: 0.00 },
  RESL: { VL: 7.07, L: 5.65, N: 4.24, H: 2.83, VH: 1.41, XH: 0.00 },
  TEAM: { VL: 5.48, L: 4.38, N: 3.29, H: 2.19, VH: 1.10, XH: 0.00 },
  PMAT: { VL: 7.80, L: 6.24, N: 4.68, H: 3.12, VH: 1.56, XH: 0.00 },
} as const;

// B = 0.91 + 0.01 × Σ(SF_i)
export const SCALE_EXPONENT_BASE = 0.91;
export const SCALE_EXPONENT_FACTOR = 0.01;

// Default nominal EAF (all effort multipliers at nominal = 1.0)
export const NOMINAL_EAF = 1.0;
