import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCalendar,
  getConfiguration,
  getCurrentState,
  getErrorLogs,
  getHealth,
  getPollingLogs,
  getShellyDevices,
  getShellyStato,
  setShellyRelay,
  updateCalendar,
  updateConfiguration
} from '../api/endpoints';
import type { CalendarDocument, ShellyStato, SystemConfiguration } from '../api/types';

export const queryKeys = {
  state: ['current-state'] as const,
  health: ['health'] as const,
  configuration: ['configuration'] as const,
  calendar: ['calendar'] as const,
  pollingLogs: (from?: string, to?: string) => ['polling-logs', from ?? '', to ?? ''] as const,
  errorLogs: (from?: string, to?: string) => ['error-logs', from ?? '', to ?? ''] as const,
  shellyDevices: ['shelly-devices'] as const,
  shellyStato: (id: string) => ['shelly-stato', id] as const
};

export const SHELLY_STATO_REFRESH_MS = 30_000;

export function useCurrentState() {
  return useQuery({
    queryKey: queryKeys.state,
    queryFn: getCurrentState,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 0
  });
}

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: getHealth,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: false,
    staleTime: 30_000
  });
}

export function useConfiguration() {
  return useQuery({
    queryKey: queryKeys.configuration,
    queryFn: getConfiguration,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false
  });
}

export function useUpdateConfiguration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateConfiguration,
    onSuccess: (configuration) => {
      queryClient.setQueryData(queryKeys.configuration, configuration);
    }
  });
}

export function useCalendar() {
  return useQuery({ queryKey: queryKeys.calendar, queryFn: getCalendar });
}

export function useUpdateCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCalendar,
    onSuccess: (calendar) => {
      queryClient.setQueryData(queryKeys.calendar, calendar);
    }
  });
}

export function usePollingLogs(from?: string, to?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.pollingLogs(from, to),
    queryFn: () => getPollingLogs({ from, to }),
    enabled,
    staleTime: 30_000
  });
}

export function useErrorLogs(from?: string, to?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.errorLogs(from, to),
    queryFn: () => getErrorLogs({ from, to }),
    enabled,
    staleTime: 30_000
  });
}

export function useShellyDevices() {
  return useQuery({
    queryKey: queryKeys.shellyDevices,
    queryFn: getShellyDevices,
    staleTime: 30_000
  });
}

export interface ShellyStatoOptions {
  enabled?: boolean;
  refetchIntervalMs?: number;
}

export function useShellyStato(id: string, { enabled = true, refetchIntervalMs = SHELLY_STATO_REFRESH_MS }: ShellyStatoOptions = {}) {
  return useQuery({
    queryKey: queryKeys.shellyStato(id),
    queryFn: () => getShellyStato(id),
    enabled: enabled && id !== '',
    refetchInterval: refetchIntervalMs,
    refetchIntervalInBackground: false,
    staleTime: 0
  });
}

export function useShellyRelayCommand(id: string, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (on: boolean) => setShellyRelay(id, on),
    onSuccess: (stato) => {
      queryClient.setQueryData<ShellyStato>(queryKeys.shellyStato(id), (current) =>
        current ? { ...current, acceso: stato.acceso } : current
      );
      onSuccess?.();
    }
  });
}

export type ConfigurationFormData = SystemConfiguration;
export type CalendarData = CalendarDocument;
