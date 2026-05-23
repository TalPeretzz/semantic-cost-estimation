import { createZodDto } from 'nestjs-zod';
import { updateProjectSchema } from '@sce/types';

export class UpdateProjectDto extends createZodDto(updateProjectSchema) {}
