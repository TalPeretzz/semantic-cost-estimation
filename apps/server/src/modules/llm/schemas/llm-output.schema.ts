import { z } from 'zod';

const levelSchema = z.enum(['very_low', 'low', 'medium', 'high', 'very_high']);
const entrySchema = z.object({
  level: levelSchema,
  rationale: z.string().min(5).max(600).transform((s) => s.slice(0, 500)),
});

export const llmOutputSchema = z.object({
  functional_complexity: entrySchema,
  architectural_complexity: entrySchema,
  external_integrations: entrySchema,
  requirement_stability: entrySchema,
  uncertainty: entrySchema,
});

export type LlmOutput = z.infer<typeof llmOutputSchema>;
