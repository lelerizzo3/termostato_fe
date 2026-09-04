import { apiRequest } from './client';
import type {
  CalendarDocument,
  CurrentState,
  ErrorLogRecord,
  HealthResponse,
  PollingLogRecord,
  SystemConfiguration
} from './types';

export function getCurrentState(): Promise<CurrentState> {
  return apiRequest<CurrentState>('/stato');
}

export function getConfiguration(): Promise<SystemConfiguration> {
  return apiRequest<SystemConfiguration>('/config');
}

export function updateConfiguration(configuration: SystemConfiguration): Promise<SystemConfiguration> {
  return apiRequest<SystemConfiguration>('/config', {
    method: 'PUT',
    body: JSON.stringify(configuration)
  });
}

export function getCalendar(): Promise<CalendarDocument> {
  return apiRequest<CalendarDocument>('/config/calendario');
}

export function updateCalendar(calendar: CalendarDocument): Promise<CalendarDocument> {
  return apiRequest<CalendarDocument>('/config/calendario', {
    method: 'PUT',
    body: JSON.stringify(calendar)
  });
}

interface DateRange {
  from?: string;
  to?: string;
}

function rangeQuery({ from, to }: DateRange = {}): string {
  const params = new URLSearchParams();
  if (from) params.set('da', from);
  if (to) params.set('a', to);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function getPollingLogs(range?: DateRange): Promise<PollingLogRecord[]> {
  return apiRequest<PollingLogRecord[]>(`/log${rangeQuery(range)}`);
}

export function getErrorLogs(range?: DateRange): Promise<ErrorLogRecord[]> {
  return apiRequest<ErrorLogRecord[]>(`/log/errori${rangeQuery(range)}`);
}

export function getHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/actuator/health');
}
