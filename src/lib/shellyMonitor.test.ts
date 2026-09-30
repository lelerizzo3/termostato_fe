import { describe, expect, it } from 'vitest';
import { barHeightWatts, MONITOR_GREEN_W, MONITOR_MAX_W, monitorColor } from './shellyMonitor';

describe('monitorColor', () => {
  it('è verde sotto i 100 W (inclusi)', () => {
    expect(monitorColor(null)).toBe('#334155');
    expect(monitorColor(0)).toBe('#22c55e');
    expect(monitorColor(99)).toBe('#22c55e');
    expect(monitorColor(MONITOR_GREEN_W)).toBe('#22c55e');
  });

  it('è rosso a 2000 W e oltre', () => {
    expect(monitorColor(MONITOR_MAX_W)).toBe('#ef4444');
    expect(monitorColor(2500)).toBe('#ef4444');
  });

  it('interpola l arancione tra 100 W e 2000 W', () => {
    const mid = monitorColor((MONITOR_GREEN_W + MONITOR_MAX_W) / 2);
    expect(mid).toBe('hsl(60, 85%, 50%)');
  });
});

describe('barHeightWatts', () => {
  it('ritorna 0 per valori assenti e limita l altezza a 2000 W', () => {
    expect(barHeightWatts(null)).toBe(0);
    expect(barHeightWatts(undefined)).toBe(0);
    expect(barHeightWatts(45.2)).toBe(45.2);
    expect(barHeightWatts(2100)).toBe(MONITOR_MAX_W);
  });
});