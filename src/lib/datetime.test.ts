import { describe, expect, it } from 'vitest';
import { formatLocalTime, normalizeIsoTimestamp } from './datetime';

describe('datetime helpers', () => {
  it('normalizza e preserva un timestamp locale Java con nove cifre frazionarie', () => {
    const value = '2026-09-04T10:00:00.000000000';
    expect(normalizeIsoTimestamp(value)).toBe('2026-09-04T10:00:00.000');
    expect(formatLocalTime(value)).toBe('10:00');
  });

  it('formatta il wall-clock locale senza conversione di fuso', () => {
    expect(formatLocalTime('2026-09-04T23:05:00')).toBe('23:05');
  });
});
