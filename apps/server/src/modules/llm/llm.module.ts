import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { LlmPromptBuilder } from './llm-prompt.builder';
import { TextNormalizerService } from './text-normalizer.service';
import { GptValidationService } from './gpt-validation.service';

@Module({
  providers: [LlmService, LlmPromptBuilder, TextNormalizerService, GptValidationService],
  exports: [LlmService, TextNormalizerService, GptValidationService],
})
export class LlmModule {}
