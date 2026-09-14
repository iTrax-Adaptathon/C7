import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatDate,
  formatDayLabel,
  formatPrescription,
  formatTime,
  formatWeight,
  localDayKey,
  parseUtc,
  toNaiveUtc,
} from './format';

describe('parseUtc', () => {
  it('treats a naive backend timestamp as UTC', () => {
    expect(parseUtc('2026-09-14T15:20:59').getTime()).toBe(Date.UTC(2026, 8, 14, 15, 20, 59));
  });

  it('leaves an explicit timezone alone', () => {
    expect(parseUtc('2026-09-14T15:20:59Z').getTime()).toBe(Date.UTC(2026, 8, 14, 15, 20, 59));
    expect(parseUtc('2026-09-14T15:20:59+02:00').getTime()).toBe(Date.UTC(2026, 8, 14, 13, 20, 59));
  });
});

describe('toNaiveUtc', () => {
  it('produces the backend format without Z or milliseconds', () => {
    expect(toNaiveUtc(new Date(Date.UTC(2026, 8, 14, 15, 20, 59, 123)))).toBe('2026-09-14T15:20:59');
  });
});

describe('formatWeight / formatPrescription', () => {
  it('drops a trailing .0 but keeps .5', () => {
    expect(formatWeight(60)).toBe('60 kg');
    expect(formatWeight(62.5)).toBe('62.5 kg');
    expect(formatWeight(100.0)).toBe('100 kg');
  });

  it('renders weight × reps × sets', () => {
    expect(formatPrescription({ weight: 62.5, reps: 8, sets: 3 })).toBe('62.5 kg × 8 × 3');
  });
});

describe('date labels', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 8, 14, 18, 0, 0)));
  });
  afterEach(() => vi.useRealTimers());

  it('labels today and yesterday relative to now', () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 3600 * 1000);
    expect(formatDayLabel(toNaiveUtc(today))).toBe('Today');
    expect(formatDayLabel(toNaiveUtc(yesterday))).toBe('Yesterday');
  });

  it('falls back to a weekday + date for older sessions', () => {
    expect(formatDayLabel('2026-09-01T10:00:00')).toMatch(/^[A-Z][a-z]{2}, Sep 1$/);
  });

  it('formats short dates and times', () => {
    expect(formatDate('2026-09-01T10:00:00')).toBe('Sep 1');
    expect(formatTime('2026-09-01T10:05:00')).toMatch(/^\d{1,2}:\d{2}/);
  });

  it('groups by local calendar day', () => {
    const a = localDayKey('2026-09-14T15:20:59');
    const b = localDayKey('2026-09-14T15:30:00');
    expect(a).toBe(b);
    expect(a).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
