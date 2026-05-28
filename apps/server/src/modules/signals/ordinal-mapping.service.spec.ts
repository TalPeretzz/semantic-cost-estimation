import { OrdinalMappingService } from './ordinal-mapping.service';

describe('OrdinalMappingService', () => {
  const service = new OrdinalMappingService();

  describe('toOrdinal', () => {
    it.each([
      ['very_low', -3],
      ['low', -1],
      ['medium', 0],
      ['high', 1],
      ['very_high', 3],
    ] as const)('%s → %i', (level, expected) => {
      expect(service.toOrdinal(level)).toBe(expected);
    });
  });

  describe('toFactor', () => {
    it.each([
      [-3, 0.7],
      [-1, 0.9],
      [0, 1.0],
      [1, 1.1],
      [3, 1.3],
    ] as const)('ordinal %i → factor %f', (ordinal, expected) => {
      expect(service.toFactor(ordinal)).toBeCloseTo(expected, 5);
    });
  });
});
