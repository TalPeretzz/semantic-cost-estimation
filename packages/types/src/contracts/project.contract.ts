import { z } from 'zod';

export const domainTypeSchema = z.enum(['organic', 'semi-detached', 'embedded']);
export const experienceLevelSchema = z.enum(['very_low', 'low', 'nominal', 'high', 'very_high']);
export const inputTypeSchema = z.enum(['freetext', 'structured']);

const baseProjectSchema = z.object({
  name: z.string().min(1).max(200),
  domain: domainTypeSchema,
  sizeKloc: z.number().positive(),
  teamSize: z.number().int().min(1).max(500),
  experienceLevel: experienceLevelSchema,
  actualEffortPm: z.number().positive().nullable().optional(),
});

export const createProjectSchema = z.discriminatedUnion('inputType', [
  baseProjectSchema.extend({
    inputType: z.literal('freetext'),
    descriptionText: z.string().min(1).max(10000),
  }),
  baseProjectSchema.extend({
    inputType: z.literal('structured'),
    descriptionJson: z.record(z.string().min(1), z.string().min(1)).refine(
      (obj) => Object.keys(obj).length >= 1,
      { message: 'Structured description must have at least one field' },
    ),
  }),
]);

// Flat schema used by createZodDto — discriminatedUnion cannot be extended by a class.
// superRefine enforces the same mutual-exclusion + required-field rules.
export const createProjectDtoSchema = z
  .object({
    name: z.string().min(1).max(200),
    inputType: inputTypeSchema,
    descriptionText: z.string().min(1).max(10000).optional(),
    descriptionJson: z
      .record(z.string().min(1), z.string().min(1))
      .refine((obj) => Object.keys(obj).length >= 1, {
        message: 'Structured description must have at least one field',
      })
      .optional(),
    domain: domainTypeSchema,
    sizeKloc: z.number().positive(),
    teamSize: z.number().int().min(1).max(500),
    experienceLevel: experienceLevelSchema,
    actualEffortPm: z.number().positive().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.inputType === 'freetext' && !data.descriptionText) {
      ctx.addIssue({ code: 'custom', message: 'descriptionText is required when inputType is freetext' });
    }
    if (data.inputType === 'structured' && !data.descriptionJson) {
      ctx.addIssue({ code: 'custom', message: 'descriptionJson is required when inputType is structured' });
    }
    if (data.inputType === 'freetext' && data.descriptionJson !== undefined) {
      ctx.addIssue({ code: 'custom', message: 'Cannot provide descriptionJson when inputType is freetext' });
    }
    if (data.inputType === 'structured' && data.descriptionText !== undefined) {
      ctx.addIssue({ code: 'custom', message: 'Cannot provide descriptionText when inputType is structured' });
    }
  });

// updateProjectSchema: all fields optional, with cross-field guard via superRefine.
// We cannot call .partial() on a discriminatedUnion (Zod v3 limitation), so we
// flatten the union variants into a single optional-field object and add the
// cross-field rule explicitly.
export const updateProjectSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    domain: domainTypeSchema.optional(),
    sizeKloc: z.number().positive().optional(),
    teamSize: z.number().int().min(1).max(500).optional(),
    experienceLevel: experienceLevelSchema.optional(),
    actualEffortPm: z.number().positive().nullable().optional(),
    inputType: inputTypeSchema.optional(),
    descriptionText: z.string().min(1).max(10000).optional(),
    descriptionJson: z
      .record(z.string().min(1), z.string().min(1))
      .refine((obj) => Object.keys(obj).length >= 1, {
        message: 'Structured description must have at least one field',
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.inputType === 'freetext' && data.descriptionJson !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'Cannot provide descriptionJson when inputType is freetext',
      });
    }
    if (data.inputType === 'structured' && data.descriptionText !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'Cannot provide descriptionText when inputType is structured',
      });
    }
    // Changing inputType without the matching description field would leave
    // the project in an inconsistent state (wrong discriminator, stale description).
    if (data.inputType === 'freetext' && data.descriptionText === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'descriptionText is required when changing inputType to freetext',
      });
    }
    if (data.inputType === 'structured' && data.descriptionJson === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'descriptionJson is required when changing inputType to structured',
      });
    }
  });

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
