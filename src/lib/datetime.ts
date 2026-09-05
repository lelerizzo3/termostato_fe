export function normalizeIsoTimestamp(value: string): string {
  return value.replace(/\.(\d{3})\d+(Z|[+-]\d{2}:?\d{2})$/, '.$1$2');
}

export function parseApiTimestamp(value: string): Date {
  return new Date(normalizeIsoTimestamp(value));
}

const dateTimeFormatter = new Intl.DateTimeFormat('it-IT', {
  dateStyle: 'short',
  timeStyle: 'short'
});
const timeFormatter = new Intl.DateTimeFormat('it-IT', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

export function formatLocalDateTime(value: string): string {
  const date = parseApiTimestamp(value);
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
}

export function formatLocalTime(value: string): string {
  const date = parseApiTimestamp(value);
  return Number.isNaN(date.getTime()) ? '—' : timeFormatter.format(date);
}

export function formatTemperature(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value.toFixed(1)} °C`;
}

export function formatHumidity(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value.toFixed(1)} %`;
}

export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isValidDateRange(from: string, to: string): boolean {
  return !from || !to || from <= to;
}

export function localNowTime(): string {
  return timeFormatter.format(new Date());
}
