import { createZodDto } from 'nestjs-zod';
import { createProjectDtoSchema } from '@sce/types';

export class CreateProjectDto extends createZodDto(createProjectDtoSchema) {}
