import type { CalendarDocument, DayKey, TimeInterval } from '../api/types';

export const DAY_KEYS: DayKey[] = [
  'lunedi',
  'martedi',
  'mercoledi',
  'giovedi',
  'venerdi',
  'sabato',
  'domenica'
];

export const DAY_LABELS: Record<DayKey, string> = {
  lunedi: 'Lunedì',
  martedi: 'Martedì',
  mercoledi: 'Mercoledì',
  giovedi: 'Giovedì',
  venerdi: 'Venerdì',
  sabato: 'Sabato',
  domenica: 'Domenica'
};




export function emptyCalendar(): CalendarDocument {
  return {
    giorni: {
      lunedi: [],
      martedi: [],
      mercoledi: [],
      giovedi: [],
      venerdi: [],
      sabato: [],
      domenica: []
    }
  };
}

export function normalizeTimeToHHmm(value: string): string {
  return value.slice(0, 5);
}

export function normalizeCalendarTimes(source: CalendarDocument): CalendarDocument {
  const normalized = emptyCalendar();
  for (const day of DAY_KEYS) {
    normalized.giorni[day] = source.giorni[day].map((interval) => ({
      ...interval,
      ora_inizio: normalizeTimeToHHmm(interval.ora_inizio),
      ora_fine: normalizeTimeToHHmm(interval.ora_fine)
    }));
  }
  return normalized;
}

export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
  return hours * 60 + minutes;
}

export function sortIntervals(intervals: TimeInterval[]): TimeInterval[] {
  return [...intervals].sort((a, b) => timeToMinutes(a.ora_inizio) - timeToMinutes(b.ora_inizio));
}

function dayIndexFromDate(date: Date): number {
  // JS getDay(): 0 = domenica … 6 = sabato. DAY_KEYS parte da lunedì.
  return (date.getDay() + 6) % 7;
}

/**
 * Calcola l'istante di inizio della prossima fascia oraria del calendario
 * rispetto a `from` (orario civile locale del dispositivo). Scorre fino a 7
 * giorni in avanti per gestire il wrap settimanale. Restituisce una stringa ISO
 * locale senza offset (`YYYY-MM-DDTHH:mm:ss`) pronta per `override_fine`, oppure
 * null se il calendario non contiene alcuna fascia.
 */
export function nextIntervalStart(calendar: CalendarDocument, from: Date = new Date()): string | null {
  const nowMinutes = from.getHours() * 60 + from.getMinutes();

  for (let offset = 0; offset < 8; offset += 1) {
    const dayIndex = (dayIndexFromDate(from) + offset) % 7;
    const day = DAY_KEYS[dayIndex];
    const starts = sortIntervals(calendar.giorni[day]).map((interval) => timeToMinutes(interval.ora_inizio));
    for (const startMinutes of starts) {
      // Oggi (offset 0) consideriamo solo gli inizi strettamente futuri.
      if (offset === 0 && startMinutes <= nowMinutes) continue;
      const target = new Date(from);
      target.setDate(target.getDate() + offset);
      target.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
      const year = target.getFullYear();
      const month = String(target.getMonth() + 1).padStart(2, '0');
      const dayOfMonth = String(target.getDate()).padStart(2, '0');
      const hours = String(target.getHours()).padStart(2, '0');
      const minutes = String(target.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${dayOfMonth}T${hours}:${minutes}:00`;
    }
  }
  return null;
}

export function validateIntervals(intervals: TimeInterval[]): string | null {
  const sorted = sortIntervals(intervals);
  for (const interval of sorted) {
    if (!/^\d{2}:\d{2}$/.test(interval.ora_inizio) || !/^\d{2}:\d{2}$/.test(interval.ora_fine)) {
      return 'Gli orari devono usare il formato HH:mm.';
    }
    if (timeToMinutes(interval.ora_inizio) >= timeToMinutes(interval.ora_fine)) {
      return `L'intervallo ${interval.ora_inizio}–${interval.ora_fine} non è valido.`;
    }
  }
  for (let index = 1; index < sorted.length; index += 1) {
    if (timeToMinutes(sorted[index - 1].ora_fine) > timeToMinutes(sorted[index].ora_inizio)) {
      return 'Due intervalli dello stesso giorno si sovrappongono.';
    }
  }
  return null;
}
