import { IsString, IsArray, IsUUID, ArrayMinSize, MinLength } from 'class-validator';

export class RunEvaluationDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsUUID('all', { each: true })
  projectIds!: string[];
}
