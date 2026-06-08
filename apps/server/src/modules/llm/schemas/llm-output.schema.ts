import { z } from 'zod';

const levelSchema = z.enum(['very_low', 'low', 'medium', 'high', 'very_high']);
const entrySchema = z.object({
  level: levelSchema,
  rationale: z.string().min(5).max(600).transform((s) => s.slice(0, 500)),
});

export const llmOutputSchema = z.object({
  // Adjustment signals — map to ordinal factors applied to E_nom
  functional_complexity:    entrySchema,
  architectural_complexity: entrySchema,
  external_integrations:    entrySchema,
  requirement_stability:    entrySchema,
  uncertainty:              entrySchema,

  // Scale factor signals — map to COCOMO II SF values that determine exponent B
  // Higher level = more favorable condition = lower SF value = lower B
  precedentedness:          entrySchema,
  development_flexibility:  entrySchema,
  architecture_risk:        entrySchema,
  team_cohesion:            entrySchema,
  process_maturity:         entrySchema,
});

export type LlmOutput = z.infer<typeof llmOutputSchema>;
