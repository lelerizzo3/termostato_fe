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

const DAY_INDEX: Record<DayKey, number> = {
  lunedi: 0,
  martedi: 1,
  mercoledi: 2,
  giovedi: 3,
  venerdi: 4,
  sabato: 5,
  domenica: 6
};

const INDEX_DAY: DayKey[] = DAY_KEYS;
const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6
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

function weekStartUtc(): Date {
  const now = new Date();
  const mondayOffset = (now.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - mondayOffset));
}

function weekStartLocal(): Date {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
}

function localParts(date: Date): { dayIndex: number; hours: number; minutes: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    dayIndex: WEEKDAY_INDEX[parts.weekday] ?? 0,
    hours: Number(parts.hour),
    minutes: Number(parts.minute)
  };
}

function utcDayKey(date: Date): DayKey {
  return INDEX_DAY[(date.getUTCDay() + 6) % 7];
}

function hhmm(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function dateFromUtcDay(day: DayKey, time: string): Date {
  const date = weekStartUtc();
  date.setUTCDate(date.getUTCDate() + DAY_INDEX[day]);
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number);
  date.setUTCHours(hours, minutes, 0, 0);
  return date;
}

function dateFromLocalDay(day: DayKey, time: string): Date {
  const date = weekStartLocal();
  date.setDate(date.getDate() + DAY_INDEX[day]);
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export interface CalendarConversion {
  calendar: CalendarDocument;
  warnings: string[];
}

export function utcCalendarToLocal(source: CalendarDocument): CalendarConversion {
  const result = emptyCalendar();
  const warnings: string[] = [];
  for (const day of DAY_KEYS) {
    for (const interval of source.giorni[day]) {
      const start = localParts(dateFromUtcDay(day, interval.ora_inizio));
      const end = localParts(dateFromUtcDay(day, interval.ora_fine));
      const localDay = INDEX_DAY[start.dayIndex];
      if (start.dayIndex !== end.dayIndex) {
        warnings.push(`${DAY_LABELS[day]} ${interval.ora_inizio}–${interval.ora_fine} attraversa la mezzanotte locale.`);
      }
      result.giorni[localDay].push({
        ora_inizio: hhmm(start.hours, start.minutes),
        ora_fine: hhmm(end.hours, end.minutes),
        temperatura_target: interval.temperatura_target
      });
    }
  }
  for (const day of DAY_KEYS) result.giorni[day] = sortIntervals(result.giorni[day]);
  return { calendar: result, warnings };
}

export function localCalendarToUtc(source: CalendarDocument): CalendarConversion {
  const result = emptyCalendar();
  const warnings: string[] = [];
  for (const day of DAY_KEYS) {
    for (const interval of source.giorni[day]) {
      const startDate = dateFromLocalDay(day, interval.ora_inizio);
      const endDate = dateFromLocalDay(day, interval.ora_fine);
      const utcDay = utcDayKey(startDate);
      const endDay = utcDayKey(endDate);
      if (utcDay !== endDay) {
        warnings.push(`${DAY_LABELS[day]} ${interval.ora_inizio}–${interval.ora_fine} attraversa la mezzanotte UTC e non può essere salvato come intervallo singolo.`);
        continue;
      }
      result.giorni[utcDay].push({
        ora_inizio: hhmm(startDate.getUTCHours(), startDate.getUTCMinutes()),
        ora_fine: hhmm(endDate.getUTCHours(), endDate.getUTCMinutes()),
        temperatura_target: interval.temperatura_target
      });
    }
  }
  for (const day of DAY_KEYS) result.giorni[day] = sortIntervals(result.giorni[day]);
  return { calendar: result, warnings };
}
