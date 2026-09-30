import type { ShellyTipo } from '../api/types';

export function hasRelay(tipo: ShellyTipo): boolean {
  return tipo === 'RELAY' || tipo === 'PM_RELAY';
}

export function hasPowerMeter(tipo: ShellyTipo): boolean {
  return tipo === 'PM' || tipo === 'PM_RELAY';
}

export function formatPotenza(watts: number | null | undefined): string {
  return watts == null ? '—' : `${watts.toFixed(1)} W`;
}

export function formatTensione(volts: number | null | undefined): string {
  return volts == null ? '—' : `${volts.toFixed(1)} V`;
}

export function formatCorrente(amps: number | null | undefined): string {
  return amps == null ? '—' : `${amps.toFixed(2)} A`;
}
