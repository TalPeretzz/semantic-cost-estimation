import { Injectable } from '@nestjs/common';

const MAX_CHARS = 6000;

@Injectable()
export class TextNormalizerService {
  normalize(input: {
    inputType: 'freetext' | 'structured';
    descriptionText?: string | null;
    descriptionJson?: Record<string, string> | null;
  }): string {
    let raw: string;

    if (input.inputType === 'freetext') {
      raw = input.descriptionText ?? '';
    } else {
      const json = input.descriptionJson ?? {};
      raw = Object.entries(json)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    }

    return raw
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\S+@\S+\.\S+/g, '')
      .replace(/[^\w\s.,!?;:()\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_CHARS);
  }
}
