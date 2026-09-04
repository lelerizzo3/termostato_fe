import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCalendar,
  getConfiguration,
  getCurrentState,
  getErrorLogs,
  getHealth,
  getPollingLogs,
  updateCalendar,
  updateConfiguration
} from '../api/endpoints';
import type { CalendarDocument, SystemConfiguration } from '../api/types';

export const queryKeys = {
  state: ['current-state'] as const,
  health: ['health'] as const,
  configuration: ['configuration'] as const,
  calendar: ['calendar'] as const,
  pollingLogs: (from?: string, to?: string) => ['polling-logs', from ?? '', to ?? ''] as const,
  errorLogs: (from?: string, to?: string) => ['error-logs', from ?? '', to ?? ''] as const
};

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
  return useQuery({ queryKey: queryKeys.configuration, queryFn: getConfiguration });
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

export type ConfigurationFormData = SystemConfiguration;
export type CalendarData = CalendarDocument;
