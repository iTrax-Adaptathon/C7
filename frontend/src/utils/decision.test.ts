import { describe, expect, it } from 'vitest';
import { decisionTheme, rpeTier, trendLabel, weightDelta } from './decision';

describe('decisionTheme', () => {
  it('keeps the decision text verbatim and assigns one colour per decision', () => {
    expect(decisionTheme('PROGRESS').label).toBe('PROGRESS');
    expect(decisionTheme('HOLD').label).toBe('HOLD');
    expect(decisionTheme('BACK OFF').label).toBe('BACK OFF');
    const accents = new Set(['PROGRESS', 'HOLD', 'BACK OFF'].map((d) => decisionTheme(d as never).accent));
    expect(accents.size).toBe(3);
  });
});

describe('trendLabel', () => {
  it('maps the backend trend enum to readable text', () => {
    expect(trendLabel('IMPROVING')).toBe('Improving');
    expect(trendLabel('STABLE')).toBe('Stable');
    expect(trendLabel('DECLINING')).toBe('Declining');
  });
});

describe('rpeTier', () => {
  it('uses the 1-3 / 4-6 / 7-8 / 9-10 bands', () => {
    expect(rpeTier(1).label).toBe('Easy');
    expect(rpeTier(3).label).toBe('Easy');
    expect(rpeTier(4).label).toBe('Moderate');
    expect(rpeTier(6).label).toBe('Moderate');
    expect(rpeTier(7).label).toBe('Hard');
    expect(rpeTier(8).label).toBe('Hard');
    expect(rpeTier(9).label).toBe('Max effort');
    expect(rpeTier(10).label).toBe('Max effort');
  });
});

describe('weightDelta', () => {
  it('describes the change between two prescriptions', () => {
    expect(weightDelta(60, 62.5)).toBe('+2.5 kg');
    expect(weightDelta(62.5, 55)).toBe('−7.5 kg');
    expect(weightDelta(60, 60)).toBeNull();
  });
});
