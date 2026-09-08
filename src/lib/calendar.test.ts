import { describe, expect, it } from 'vitest';
import { emptyCalendar, normalizeCalendarTimes, sortIntervals, validateIntervals } from './calendar';

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

  it('mantiene gli orari locali nel calendario inviato', () => {
    const source = emptyCalendar();
    source.giorni.lunedi = [{ ora_inizio: '06:00', ora_fine: '08:00', temperatura_target: 20.5 }];
    expect(sortIntervals(source.giorni.lunedi)).toEqual(source.giorni.lunedi);
  });

  it('riduce gli orari ricevuti con secondi al formato HH:mm', () => {
    const source = emptyCalendar();
    source.giorni.lunedi = [{ ora_inizio: '06:00:00', ora_fine: '08:00:30', temperatura_target: 20.5 }];

    const normalized = normalizeCalendarTimes(source);

    expect(normalized.giorni.lunedi).toEqual([{
      ora_inizio: '06:00',
      ora_fine: '08:00',
      temperatura_target: 20.5
    }]);
    expect(source.giorni.lunedi[0].ora_inizio).toBe('06:00:00');
  });
});

