import { Controller, Post, Get, Param, Query, Body } from '@nestjs/common';
import { EstimationService } from './estimation.service';
import { RunEstimationDto } from './dto/run-estimation.dto';

@Controller('estimations')
export class EstimationController {
  constructor(private readonly estimationService: EstimationService) {}

  @Post()
  run(@Body() dto: RunEstimationDto) {
    return this.estimationService.runEstimation(dto.projectId);
  }

  @Get()
  findByProject(@Query('projectId') projectId: string) {
    return this.estimationService.findByProject(projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.estimationService.findOne(id);
  }
}
