import { describe, expect, it } from 'vitest';
import { formatCorrente, formatPotenza, formatTensione, hasPowerMeter, hasRelay } from './shelly';

describe('hasRelay', () => {
  it('è vero solo per i tipi con relè comandabile', () => {
    expect(hasRelay('RELAY')).toBe(true);
    expect(hasRelay('PM_RELAY')).toBe(true);
    expect(hasRelay('PM')).toBe(false);
  });
});

describe('hasPowerMeter', () => {
  it('è vero solo per i tipi con misure elettriche', () => {
    expect(hasPowerMeter('PM')).toBe(true);
    expect(hasPowerMeter('PM_RELAY')).toBe(true);
    expect(hasPowerMeter('RELAY')).toBe(false);
  });
});

describe('formattazione misure', () => {
  it('rende — quando la misura è null o assente, senza mostrarre 0', () => {
    expect(formatPotenza(null)).toBe('—');
    expect(formatPotenza(undefined)).toBe('—');
    expect(formatTensione(null)).toBe('—');
    expect(formatCorrente(null)).toBe('—');
  });

  it('rende 0 solo quando la misura vale davvero 0', () => {
    expect(formatPotenza(0)).toBe('0.0 W');
    expect(formatTensione(0)).toBe('0.0 V');
    expect(formatCorrente(0)).toBe('0.00 A');
  });

  it('arrotonda con la precisione attesa', () => {
    expect(formatPotenza(45.24)).toBe('45.2 W');
    expect(formatTensione(229.78)).toBe('229.8 V');
    expect(formatCorrente(0.197)).toBe('0.20 A');
  });
});
