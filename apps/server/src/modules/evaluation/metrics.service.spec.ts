import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  const service = new MetricsService();

  const actual    = [100, 200, 150, 80, 120];
  const predicted = [110, 180, 160, 90, 100];

  describe('computeMAE', () => {
    it('computes mean absolute error correctly', () => {
      // |100-110| + |200-180| + |150-160| + |80-90| + |120-100| = 10+20+10+10+20 = 70 / 5 = 14
      expect(service.computeMAE(actual, predicted)).toBeCloseTo(14, 5);
    });

    it('returns 0 when predicted matches actual exactly', () => {
      expect(service.computeMAE([10, 20], [10, 20])).toBe(0);
    });

    it('works with a single element', () => {
      expect(service.computeMAE([50], [60])).toBeCloseTo(10, 5);
    });
  });

  describe('computeRMSE', () => {
    it('computes root mean squared error correctly', () => {
      // (100+400+100+100+400)/5 = 220 → sqrt(220) ≈ 14.832
      expect(service.computeRMSE(actual, predicted)).toBeCloseTo(Math.sqrt(220), 3);
    });

    it('returns 0 when predicted matches actual exactly', () => {
      expect(service.computeRMSE([10, 20], [10, 20])).toBe(0);
    });

    it('is always >= MAE', () => {
      const rmse = service.computeRMSE(actual, predicted);
      const mae  = service.computeMAE(actual, predicted);
      expect(rmse).toBeGreaterThanOrEqual(mae);
    });
  });

  describe('computeMAPE', () => {
    it('computes mean absolute percentage error correctly', () => {
      // (10/100 + 20/200 + 10/150 + 10/80 + 20/120) / 5 * 100
      const expected =
        ((10 / 100 + 20 / 200 + 10 / 150 + 10 / 80 + 20 / 120) / 5) * 100;
      expect(service.computeMAPE(actual, predicted)).toBeCloseTo(expected, 3);
    });

    it('returns 0 when predicted matches actual exactly', () => {
      expect(service.computeMAPE([10, 20], [10, 20])).toBe(0);
    });

    it('returns value in percentage (not decimal)', () => {
      expect(service.computeMAPE([100], [110])).toBeCloseTo(10, 5);
    });
  });
});
