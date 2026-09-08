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
