import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { RunEvaluationDto } from './dto/run-evaluation.dto';

@Controller('evaluations')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post()
  run(@Body() dto: RunEvaluationDto) {
    return this.evaluationService.runEvaluation(dto);
  }

  @Get()
  findAll() {
    return this.evaluationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.evaluationService.findOne(id);
  }
}
