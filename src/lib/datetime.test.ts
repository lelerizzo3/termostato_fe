import { describe, expect, it } from 'vitest';
import {
  apiTimestampToLocalInput,
  formatLocalTime,
  isFutureLocalTimestamp,
  localInputToApiTimestamp,
  normalizeIsoTimestamp
} from './datetime';

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

describe('override_fine helpers', () => {
  it('converte un timestamp API in valore per datetime-local senza secondi', () => {
    expect(apiTimestampToLocalInput('2026-09-13T08:00:00')).toBe('2026-09-13T08:00');
  });

  it('gestisce null/vuoto come stringa vuota', () => {
    expect(apiTimestampToLocalInput(null)).toBe('');
    expect(apiTimestampToLocalInput(undefined)).toBe('');
    expect(apiTimestampToLocalInput('')).toBe('');
  });

  it('serializza il valore datetime-local in ISO locale senza offset con secondi', () => {
    expect(localInputToApiTimestamp('2026-09-13T08:00')).toBe('2026-09-13T08:00:00');
    expect(localInputToApiTimestamp('2026-09-13T08:00:30')).toBe('2026-09-13T08:00:30');
  });

  it('serializza input vuoto come null', () => {
    expect(localInputToApiTimestamp('')).toBeNull();
    expect(localInputToApiTimestamp(null)).toBeNull();
  });

  it('non produce mai suffisso Z né offset', () => {
    const serialized = localInputToApiTimestamp('2026-09-13T08:00');
    expect(serialized).not.toMatch(/Z$/);
    expect(serialized).not.toMatch(/[+-]\d{2}:\d{2}$/);
  });

  it('riconosce un istante passato come non futuro', () => {
    expect(isFutureLocalTimestamp('2000-01-01T00:00')).toBe(false);
  });

  it('riconosce un istante lontano nel futuro come futuro', () => {
    expect(isFutureLocalTimestamp('2999-12-31T23:59')).toBe(true);
  });

  it('tratta null/vuoto come non futuro', () => {
    expect(isFutureLocalTimestamp(null)).toBe(false);
    expect(isFutureLocalTimestamp('')).toBe(false);
  });
});
