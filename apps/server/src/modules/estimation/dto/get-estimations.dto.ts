import { IsUUID } from 'class-validator';

export class GetEstimationsDto {
  @IsUUID()
  projectId!: string;
}
