interface WallClockTimestamp {
  date: Date;
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function normalizeIsoTimestamp(value: string): string {
  return value.replace(/\.(\d{3})\d+(?=Z|[+-]\d{2}:?\d{2}|$)/, '.$1');
}

function parseWallClockTimestamp(value: string): WallClockTimestamp | null {
  const normalized = normalizeIsoTimestamp(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?/.exec(normalized);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hours = Number(match[4]);
  const minutes = Number(match[5]);
  const seconds = Number(match[6] ?? 0);
  const milliseconds = Number((match[7] ?? '').padEnd(3, '0').slice(0, 3) || 0);
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, milliseconds));
  if (Number.isNaN(date.getTime())) return null;

  return { date, year, month, day, hours, minutes, seconds };
}

/**
 * Parses the backend wall-clock timestamp on a neutral UTC timeline.
 * The UTC timeline is only an internal ordering aid: no timezone conversion
 * is applied to the hour/minute values received from the backend.
 */
export function parseApiTimestamp(value: string): Date {
  const parsed = parseWallClockTimestamp(value);
  return parsed?.date ?? new Date(normalizeIsoTimestamp(value));
}

const wallClockDateTimeFormatter = new Intl.DateTimeFormat('it-IT', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'UTC'
});
const wallClockTimeFormatter = new Intl.DateTimeFormat('it-IT', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC'
});
const deviceTimeFormatter = new Intl.DateTimeFormat('it-IT', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

export function formatLocalDateTime(value: string): string {
  const date = parseApiTimestamp(value);
  return Number.isNaN(date.getTime()) ? '—' : wallClockDateTimeFormatter.format(date);
}

export function formatLocalTime(value: string): string {
  const date = parseApiTimestamp(value);
  return Number.isNaN(date.getTime()) ? '—' : wallClockTimeFormatter.format(date);
}

export function formatWallClockDateTime(timestampMs: number): string {
  return wallClockDateTimeFormatter.format(new Date(timestampMs));
}

export function formatWallClockTime(timestampMs: number): string {
  return wallClockTimeFormatter.format(new Date(timestampMs));
}

export function formatTemperature(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value.toFixed(1)} °C`;
}

export function formatHumidity(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value.toFixed(1)} %`;
}

export function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function isValidDateRange(from: string, to: string): boolean {
  return !from || !to || from <= to;
}

export function localNowTime(): string {
  return deviceTimeFormatter.format(new Date());
}

/**
 * Converte un timestamp del backend (ISO locale senza offset, es.
 * `2026-09-13T08:00:00`) nel formato accettato da un input `datetime-local`
 * (`YYYY-MM-DDTHH:mm`). Nessuna conversione di fuso: si preservano i valori
 * wall-clock ricevuti, coerentemente con il resto dell'app.
 * Restituisce stringa vuota per valori nulli o non parsabili.
 */
export function apiTimestampToLocalInput(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(normalizeIsoTimestamp(value));
  if (!match) return '';
  const [, year, month, day, hours, minutes] = match;
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Serializza il valore di un input `datetime-local` (`YYYY-MM-DDTHH:mm` oppure
 * `YYYY-MM-DDTHH:mm:ss`) nel formato ISO locale senza offset né suffisso `Z`
 * atteso dal backend (`YYYY-MM-DDTHH:mm:ss`, secondi normalizzati a `00`).
 * Restituisce null per input vuoto.
 */
export function localInputToApiTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(value);
  if (!match) return null;
  const [, year, month, day, hours, minutes, seconds] = match;
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds ?? '00'}`;
}

/**
 * Verifica che un timestamp wall-clock locale sia nel futuro rispetto all'orario
 * civile corrente del dispositivo. Il confronto avviene sulla stessa base
 * wall-clock (nessuna conversione di fuso), coerente con la validazione del
 * backend eseguita in orario locale.
 */
export function isFutureLocalTimestamp(value: string | null | undefined): boolean {
  if (!value) return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(value);
  if (!match) return false;
  const [, year, month, day, hours, minutes, seconds] = match.map(Number) as unknown as number[];
  const target = new Date(year, month - 1, day, hours, minutes, seconds || 0, 0);
  if (Number.isNaN(target.getTime())) return false;
  return target.getTime() > Date.now();
}

/**
 * Formattazione leggibile "GG/MM alle HH:mm" di un timestamp wall-clock locale,
 * per mostrare all'utente fino a quando la forzatura resterà attiva.
 */
export function formatOverrideEnd(value: string | null | undefined): string {
  if (!value) return '—';
  return formatLocalDateTime(value);
}

