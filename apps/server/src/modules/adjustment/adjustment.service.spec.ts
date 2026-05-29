import { AdjustmentService } from './adjustment.service';

function makeSignal(signalName: string, ordinal: number, adjustmentFactor: number) {
  return { signalName, ordinal, adjustmentFactor } as any;
}

describe('AdjustmentService', () => {
  const service = new AdjustmentService();

  describe('compute', () => {
    it('returns nominalEffortPm unchanged when all factors are 1.0', () => {
      const signals = [
        makeSignal('functional_complexity', 0, 1.0),
        makeSignal('architectural_complexity', 0, 1.0),
        makeSignal('external_integrations', 0, 1.0),
        makeSignal('requirement_stability', 0, 1.0),
        makeSignal('uncertainty', 0, 1.0),
      ];

      const result = service.compute(50, signals);

      expect(result.productOfFactors).toBeCloseTo(1.0, 5);
      expect(result.hybridEffortPm).toBeCloseTo(50.0, 5);
    });

    it('correctly computes the product of adjustment factors', () => {
      const signals = [
        makeSignal('functional_complexity', 1, 1.1),
        makeSignal('architectural_complexity', 0, 1.0),
        makeSignal('external_integrations', -1, 0.9),
        makeSignal('requirement_stability', 1, 1.1),
        makeSignal('uncertainty', -3, 0.7),
      ];

      const expectedProduct = 1.1 * 1.0 * 0.9 * 1.1 * 0.7;
      const result = service.compute(100, signals);

      expect(result.productOfFactors).toBeCloseTo(expectedProduct, 5);
      expect(result.hybridEffortPm).toBeCloseTo(100 * expectedProduct, 5);
    });

    it('returns per-signal breakdown with correct fields', () => {
      const signals = [
        makeSignal('uncertainty', 3, 1.3),
        makeSignal('functional_complexity', -3, 0.7),
      ];

      const result = service.compute(20, signals);

      expect(result.perSignalBreakdown).toHaveLength(2);
      expect(result.perSignalBreakdown[0]).toEqual({
        signalName: 'uncertainty',
        ordinal: 3,
        factor: 1.3,
      });
      expect(result.perSignalBreakdown[1]).toEqual({
        signalName: 'functional_complexity',
        ordinal: -3,
        factor: 0.7,
      });
    });

    it('all very high factors (1.3^5) ≈ 3.71× baseline', () => {
      const signals = Array.from({ length: 5 }, (_, i) =>
        makeSignal(`signal_${i}`, 3, 1.3),
      );

      const result = service.compute(10, signals);

      expect(result.hybridEffortPm).toBeCloseTo(10 * Math.pow(1.3, 5), 3);
    });

    it('all very low factors (0.7^5) ≈ 0.17× baseline', () => {
      const signals = Array.from({ length: 5 }, (_, i) =>
        makeSignal(`signal_${i}`, -3, 0.7),
      );

      const result = service.compute(10, signals);

      expect(result.hybridEffortPm).toBeCloseTo(10 * Math.pow(0.7, 5), 3);
    });

    it('returns productOfFactors of 1 and same hybridEffortPm when signals array is empty', () => {
      const result = service.compute(30, []);

      expect(result.productOfFactors).toBe(1);
      expect(result.hybridEffortPm).toBe(30);
      expect(result.perSignalBreakdown).toHaveLength(0);
    });
  });
});
