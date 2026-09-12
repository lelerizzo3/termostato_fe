import { describe, expect, it } from 'vitest';
import { emptyCalendar, nextIntervalStart, normalizeCalendarTimes, sortIntervals, validateIntervals } from './calendar';

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

describe('nextIntervalStart', () => {
  // 2026-09-14 è un lunedì.
  it('trova la prossima fascia più tardi nello stesso giorno', () => {
    const calendar = emptyCalendar();
    calendar.giorni.lunedi = [
      { ora_inizio: '06:00', ora_fine: '08:00', temperatura_target: 20 },
      { ora_inizio: '18:00', ora_fine: '22:00', temperatura_target: 21 }
    ];
    const from = new Date(2026, 8, 14, 7, 30, 0); // lunedì 07:30
    expect(nextIntervalStart(calendar, from)).toBe('2026-09-14T18:00:00');
  });

  it('salta al giorno successivo con una fascia se oggi non ci sono inizi futuri', () => {
    const calendar = emptyCalendar();
    calendar.giorni.lunedi = [{ ora_inizio: '06:00', ora_fine: '08:00', temperatura_target: 20 }];
    calendar.giorni.martedi = [{ ora_inizio: '07:00', ora_fine: '09:00', temperatura_target: 20 }];
    const from = new Date(2026, 8, 14, 9, 0, 0); // lunedì 09:00, fascia già passata
    expect(nextIntervalStart(calendar, from)).toBe('2026-09-15T07:00:00');
  });

  it('gestisce il wrap settimanale fino alla domenica successiva', () => {
    const calendar = emptyCalendar();
    calendar.giorni.domenica = [{ ora_inizio: '10:00', ora_fine: '12:00', temperatura_target: 20 }];
    const from = new Date(2026, 8, 14, 12, 0, 0); // lunedì
    expect(nextIntervalStart(calendar, from)).toBe('2026-09-20T10:00:00'); // domenica successiva
  });

  it('restituisce null se il calendario è vuoto', () => {
    expect(nextIntervalStart(emptyCalendar(), new Date(2026, 8, 14, 12, 0, 0))).toBeNull();
  });
});

