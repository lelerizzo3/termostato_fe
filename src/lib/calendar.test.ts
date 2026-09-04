import { describe, expect, it } from 'vitest';
import { emptyCalendar, localCalendarToUtc, validateIntervals } from './calendar';

describe('calendar helpers', () => {
  it('rifiuta intervalli con fine precedente o uguale all’inizio', () => {
    expect(validateIntervals([{ ora_inizio: '08:00', ora_fine: '08:00', temperatura_target: 20 }])).toContain('non è valido');
    expect(validateIntervals([{ ora_inizio: '09:00', ora_fine: '08:00', temperatura_target: 20 }])).toContain('non è valido');
  });

  it('rifiuta intervalli sovrapposti', () => {
    expect(validateIntervals([
      { ora_inizio: '06:00', ora_fine: '09:00', temperatura_target: 20 },
      { ora_inizio: '08:30', ora_fine: '10:00', temperatura_target: 19 }
    ])).toContain('sovrappongono');
  });

  it('mantiene sempre i sette giorni nel payload vuoto', () => {
    expect(Object.keys(emptyCalendar().giorni)).toHaveLength(7);
  });

  it('converte gli intervalli locali in un calendario UTC valido', () => {
    const source = emptyCalendar();
    source.giorni.lunedi = [{ ora_inizio: '06:00', ora_fine: '08:00', temperatura_target: 20.5 }];
    const converted = localCalendarToUtc(source);
    expect(converted.warnings).toHaveLength(0);
    expect(Object.values(converted.calendar.giorni).flat()).toHaveLength(1);
    expect(Object.values(converted.calendar.giorni).flat()[0].temperatura_target).toBe(20.5);
  });
});
