import { TextNormalizerService } from './text-normalizer.service';

describe('TextNormalizerService', () => {
  const service = new TextNormalizerService();

  describe('freetext path', () => {
    it('lowercases the input', () => {
      const result = service.normalize({ inputType: 'freetext', descriptionText: 'Hello World' });
      expect(result).toBe('hello world');
    });

    it('strips URLs', () => {
      const result = service.normalize({
        inputType: 'freetext',
        descriptionText: 'Visit https://example.com for details.',
      });
      expect(result).not.toContain('https://');
      expect(result).toContain('visit');
      expect(result).toContain('for details.');
    });

    it('strips email addresses', () => {
      const result = service.normalize({
        inputType: 'freetext',
        descriptionText: 'Contact user@example.com for info.',
      });
      expect(result).not.toContain('@');
    });

    it('collapses multiple whitespace to single space', () => {
      const result = service.normalize({
        inputType: 'freetext',
        descriptionText: 'word   multiple   spaces',
      });
      expect(result).toBe('word multiple spaces');
    });

    it('truncates to 6000 characters', () => {
      const long = 'a '.repeat(4000);
      const result = service.normalize({ inputType: 'freetext', descriptionText: long });
      expect(result.length).toBeLessThanOrEqual(6000);
    });

    it('handles null descriptionText as empty string', () => {
      const result = service.normalize({ inputType: 'freetext', descriptionText: null });
      expect(result).toBe('');
    });
  });

  describe('structured path', () => {
    it('serializes key-value pairs as labeled prose', () => {
      const result = service.normalize({
        inputType: 'structured',
        descriptionJson: { overview: 'A payment system', tech_stack: 'Node.js and PostgreSQL' },
      });
      expect(result).toContain('overview: a payment system');
      expect(result).toContain('tech_stack: node.js and postgresql');
    });

    it('handles null descriptionJson as empty string', () => {
      const result = service.normalize({ inputType: 'structured', descriptionJson: null });
      expect(result).toBe('');
    });
  });
});
