import { HttpException, HttpStatus } from '@nestjs/common';

export class LlmUnavailableException extends HttpException {
  constructor(cause?: string) {
    super(
      `LLM service unavailable after maximum retries${cause ? ': ' + cause : ''}`,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
