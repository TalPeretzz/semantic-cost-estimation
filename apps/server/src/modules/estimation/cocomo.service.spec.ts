import { CocomoService } from './cocomo.service';

describe('CocomoService', () => {
  let service: CocomoService;

  beforeEach(() => {
    service = new CocomoService();
  });

  it('returns nominalEffortPm in expected range for 10 KLOC EAF=1.0', () => {
    const { nominalEffortPm } = service.computeNominalEffort(10, 1.0);
    expect(nominalEffortPm).toBeGreaterThan(30);
    expect(nominalEffortPm).toBeLessThan(50);
  });

  it('larger KLOC produces higher effort', () => {
    const small = service.computeNominalEffort(5, 1.0).nominalEffortPm;
    const large = service.computeNominalEffort(20, 1.0).nominalEffortPm;
    expect(large).toBeGreaterThan(small);
  });

  it('higher EAF scales effort proportionally', () => {
    const base = service.computeNominalEffort(10, 1.0).nominalEffortPm;
    const scaled = service.computeNominalEffort(10, 1.5).nominalEffortPm;
    expect(scaled).toBeCloseTo(base * 1.5, 5);
  });

  it('returns cocomoInputs with expected keys', () => {
    const { cocomoInputs } = service.computeNominalEffort(10, 1.0);
    expect(cocomoInputs).toHaveProperty('A');
    expect(cocomoInputs).toHaveProperty('B');
    expect(cocomoInputs).toHaveProperty('sizeKloc', 10);
    expect(cocomoInputs).toHaveProperty('eaf', 1.0);
    expect(cocomoInputs).toHaveProperty('scaleFactors');
  });
});
