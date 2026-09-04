import type { components, paths } from './generated';

export type SystemConfiguration = components['schemas']['SystemConfiguration'];
export type CalendarDocument = components['schemas']['CalendarDocument'];
export type TimeInterval = components['schemas']['TimeInterval'];
export type PollingLogRecord = components['schemas']['PollingLogRecord'];
export type ErrorLogRecord = components['schemas']['ErrorLogRecord'];
export type ApiErrorPayload = components['schemas']['ApiError'];
export type HealthResponse = components['schemas']['ActuatorHealth'];
export type CurrentState = paths['/stato']['get']['responses']['200']['content']['application/json'];

export type DayKey = keyof CalendarDocument['giorni'];
