import { describe, expect, it } from 'vitest';
import { formatLocalTime, normalizeIsoTimestamp, parseApiTimestamp } from './datetime';

describe('datetime helpers', () => {
  it('normalizza timestamp Java con nove cifre frazionarie', () => {
    const normalized = normalizeIsoTimestamp('2026-09-04T10:00:00.000000000Z');
    expect(normalized).toBe('2026-09-04T10:00:00.000Z');
    expect(parseApiTimestamp('2026-09-04T10:00:00.000000000Z').toISOString()).toBe('2026-09-04T10:00:00.000Z');
  });

  it('formatta un timestamp in HH:mm', () => {
    expect(formatLocalTime('2026-09-04T10:05:00.000Z')).toMatch(/^\d{2}:\d{2}$/);
  });
});
