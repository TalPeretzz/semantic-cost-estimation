import { IsUUID } from 'class-validator';

export class RunEstimationDto {
  @IsUUID()
  projectId!: string;
}
