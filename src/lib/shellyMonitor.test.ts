import { describe, expect, it } from 'vitest';
import { monitorBarPercent, MONITOR_GREEN_W, MONITOR_MAX_W, monitorColor } from './shellyMonitor';

describe('monitorColor', () => {
  it('è verde sotto i 100 W (inclusi)', () => {
    expect(monitorColor(null)).toBe('#334155');
    expect(monitorColor(0)).toBe('#22c55e');
    expect(monitorColor(99)).toBe('#22c55e');
    expect(monitorColor(MONITOR_GREEN_W)).toBe('#22c55e');
  });

  it('è rosso a 3000 W e oltre', () => {
    expect(monitorColor(MONITOR_MAX_W)).toBe('#ef4444');
    expect(monitorColor(3500)).toBe('#ef4444');
  });

  it('interpola l arancione tra 100 W e 3000 W', () => {
    const mid = monitorColor((MONITOR_GREEN_W + MONITOR_MAX_W) / 2);
    expect(mid).toBe('hsl(60, 85%, 50%)');
  });
});

describe('monitorBarPercent', () => {
  it('ritorna 0 per valori assenti e satura al 100% alla fine scala', () => {
    expect(monitorBarPercent(null)).toBe(0);
    expect(monitorBarPercent(undefined)).toBe(0);
    expect(monitorBarPercent(0)).toBe(0);
    expect(monitorBarPercent(MONITOR_MAX_W / 2)).toBeCloseTo(50, 5);
    expect(monitorBarPercent(2100)).toBe(70);
    expect(monitorBarPercent(5000)).toBe(100);
  });
});