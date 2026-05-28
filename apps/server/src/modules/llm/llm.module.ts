import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { LlmPromptBuilder } from './llm-prompt.builder';
import { TextNormalizerService } from './text-normalizer.service';

@Module({
  providers: [LlmService, LlmPromptBuilder, TextNormalizerService],
  exports: [LlmService, TextNormalizerService],
})
export class LlmModule {}
