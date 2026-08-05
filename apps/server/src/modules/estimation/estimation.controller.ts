import { ApiTags } from '@nestjs/swagger';
import { Controller, Post, Get, Param, Query, Body } from '@nestjs/common';
import { EstimationService } from './estimation.service';
import { RunEstimationDto } from './dto/run-estimation.dto';
import { GetEstimationsDto } from './dto/get-estimations.dto';

@ApiTags('estimations')
@Controller('estimations')
export class EstimationController {
  constructor(private readonly estimationService: EstimationService) {}

  @Post()
  run(@Body() dto: RunEstimationDto) {
    return this.estimationService.runEstimation(dto.projectId);
  }

  @Get()
  findByProject(@Query() query: GetEstimationsDto) {
    return this.estimationService.findByProject(query.projectId);
  }

  @Get('stats')
  getStats() {
    return this.estimationService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.estimationService.findOneWithDetail(id);
  }
}
