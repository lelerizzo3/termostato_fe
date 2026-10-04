import { FormEvent, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { getShellyStato } from '../api/endpoints';
import type { ShellyTipo } from '../api/types';
import { queryKeys, useShellyDevices } from '../hooks/useApi';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { formatWallClockDateTime } from '../lib/datetime';
import { LANDSCAPE_TABLET_QUERY } from '../lib/layout';
import { formatCorrente, formatPotenza, formatTensione, hasPowerMeter, hasRelay } from '../lib/shelly';
import { MONITOR_GREEN_W, MONITOR_MAX_W, monitorBarPercent, monitorColor } from '../lib/shellyMonitor';
import { EmptyState, ErrorState, InlineNotice, LoadingState } from '../components/common/States';

interface MonitorRow {
  id: string;
  nome: string;
  tipo: ShellyTipo;
  potenza_w: number | null;
  tensione_v: number | null;
  corrente_a: number | null;
}

const DEFAULT_INTERVAL_SECONDS = 5;
const RING_RADIUS = 34;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function deviceIcon(tipo: ShellyTipo): string {
  return hasRelay(tipo) ? '⚡' : '🔌';
}

function saturationPercent(watts: number): number {
  return Math.round((watts / MONITOR_MAX_W) * 100);
}

function scaleLegend() {
  return (
    <div className="mt-3 land:mt-2 flex flex-wrap items-center gap-x-3 land:gap-x-2 gap-y-2 border-t border-slate-700 pt-3 land:pt-2 text-xs text-slate-400">
      <span
        className="h-1.5 w-24 shrink-0 rounded-full"
        style={{ background: 'linear-gradient(90deg, #22c55e, hsl(60, 85%, 50%), #ef4444)' }}
        aria-hidden="true"
      />
      <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: monitorColor(MONITOR_GREEN_W - 50) }} />&lt; 100 W</span>
      <span className="font-semibold text-slate-200 land:hidden">▬</span>
      <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: monitorColor(1500) }} />verso arancione</span>
      <span className="font-semibold text-slate-200 land:hidden">▬</span>
      <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: monitorColor(MONITOR_MAX_W) }} />≥ {MONITOR_MAX_W} W</span>
    </div>
  );
}

function TotalRing({ watts }: { watts: number | null }) {
  const color = monitorColor(watts);
  const percent = watts == null ? 0 : saturationPercent(watts);
  return (
    <svg className="shrink-0" width="88" height="88" viewBox="0 0 88 88" role="img" aria-label={`Totale al ${percent}% della scala 0-${MONITOR_MAX_W} watt`}>
      <circle cx="44" cy="44" r={RING_RADIUS} fill="none" stroke="#0b1220" strokeWidth="10" />
      {watts != null && (
        <circle
          cx="44"
          cy="44"
          r={RING_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - Math.min(1, percent / 100))}
          transform="rotate(-90 44 44)"
          style={{ filter: `drop-shadow(0 0 5px ${color})` }}
        />
      )}
      <text x="44" y="43" textAnchor="middle" fill={watts == null ? '#64748b' : color} fontSize="20" fontWeight="700">
        {watts == null ? '—' : `${percent}%`}
      </text>
      <text x="44" y="59" textAnchor="middle" fill="#94a3b8" fontSize="9">
        scala {MONITOR_MAX_W} W
      </text>
    </svg>
  );
}

function TotalBar({ watts }: { watts: number | null }) {
  if (watts == null) {
    return (
      <div className="mt-4 h-[18px] rounded-full border border-slate-700 bg-slate-900" aria-hidden="true" />
    );
  }
  const color = monitorColor(watts);
  const greenMarkPercent = (MONITOR_GREEN_W / MONITOR_MAX_W) * 100;
  return (
    <>
      <div
        className="mt-4 h-[18px] overflow-hidden rounded-full border border-slate-700 bg-slate-900"
        role="img"
        aria-label={`Totale ${watts.toFixed(1)} watt, ${monitorBarPercent(watts).toFixed(0)}% della scala 0-${MONITOR_MAX_W} watt`}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${monitorBarPercent(watts).toFixed(1)}%`,
            background: color,
            color,
            boxShadow: '0 0 18px -2px currentColor'
          }}
        />
      </div>
      <div className="relative mt-1.5 h-4 text-[10px] text-slate-400" aria-hidden="true">
        <span className="absolute top-0 h-1.5 w-px bg-slate-500" style={{ left: `${greenMarkPercent}%` }} />
        <span className="absolute top-2 -translate-x-1/2 tabular-nums" style={{ left: `${greenMarkPercent}%` }}>{MONITOR_GREEN_W} W</span>
        <span className="absolute top-0 h-1.5 w-px bg-slate-500" style={{ left: '50%' }} />
        <span className="absolute top-0 right-0 h-1.5 w-px bg-slate-500" />
        <span className="absolute top-2 right-0 tabular-nums">{MONITOR_MAX_W} W</span>
      </div>
      {watts > MONITOR_MAX_W && (
        <p className="mt-4 text-right text-[11px] font-semibold tabular-nums text-red-400">
          ▲ {watts.toFixed(1)} W · {saturationPercent(watts)}% della scala (barra saturata)
        </p>
      )}
    </>
  );
}

interface MonitorBarProps {
  row: MonitorRow;
  totalWatts: number | null;
}

function MonitorBar({ row, totalWatts }: MonitorBarProps) {
  const color = monitorColor(row.potenza_w);
  const percent = monitorBarPercent(row.potenza_w);
  const share = row.potenza_w == null || !totalWatts ? null : Math.round((row.potenza_w / totalWatts) * 100);
  return (
    <div className="flex items-center gap-3 border-t border-slate-700/70 py-2 land:py-1" data-monitor-row={row.id}>
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-700/80 text-base"
      >
        {deviceIcon(row.tipo)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm font-semibold text-slate-100">{row.nome}</span>
          <span className="shrink-0 text-sm font-bold tabular-nums" style={{ color }}>{formatPotenza(row.potenza_w)}</span>
        </span>
        <span className="mt-1.5 block h-[7px] land:mt-1 overflow-hidden rounded-full border border-slate-700 bg-slate-900">          <span
            className="block h-full rounded-full"
            data-bar-fill={row.id}
            style={{
              width: `${percent.toFixed(1)}%`,
              background: color,
              color,
              boxShadow: '0 0 9px -1px currentColor'
            }}
          />
        </span>
        <span className="mt-1 land:mt-0.5 flex items-baseline justify-between gap-3 text-[11px] tabular-nums text-slate-400">
          <span className="truncate">
            {row.potenza_w == null
              ? 'misura non disponibile'
              : `${formatTensione(row.tensione_v)} · ${formatCorrente(row.corrente_a)}`}
          </span>
          <span className="shrink-0">{share == null ? '—' : `${share}% del totale`}</span>
        </span>
      </span>
    </div>
  );
}

export function ShellyMonitorPage() {
  const devices = useShellyDevices();
  const isWide = useMediaQuery(LANDSCAPE_TABLET_QUERY);
  const [intervalText, setIntervalText] = useState(String(DEFAULT_INTERVAL_SECONDS));
  const [appliedInterval, setAppliedInterval] = useState(DEFAULT_INTERVAL_SECONDS);
  const [intervalError, setIntervalError] = useState<string | null>(null);

  const monitors = (devices.data ?? []).filter((device) => hasPowerMeter(device.tipo));

  const statoQueries = useMemo(
    () =>
      monitors.map((device) => ({
        queryKey: queryKeys.shellyStato(device.id),
        queryFn: () => getShellyStato(device.id),
        refetchInterval: appliedInterval * 1000,
        staleTime: 0
      })),
    [monitors, appliedInterval]
  );

  const statoResults = useQueries({ queries: statoQueries });

  function applyInterval(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number(intervalText);
    if (!Number.isInteger(parsed) || parsed < 1) {
      setIntervalError('Il valore deve essere un numero intero di almeno 1 secondo.');
      return;
    }
    setIntervalError(null);
    setAppliedInterval(parsed);
  }

  if (devices.isLoading) return <LoadingState label="Caricamento dispositivi con power meter…" />;
  if (devices.isError || !devices.data) return <ErrorState error={devices.error} onRetry={() => void devices.refetch()} />;

  const rows: MonitorRow[] = monitors.map((device, index) => {
    const stato = statoResults[index]?.data;
    return {
      id: device.id,
      nome: device.nome,
      tipo: device.tipo,
      potenza_w: stato?.potenza_w ?? null,
      tensione_v: stato?.tensione_v ?? null,
      corrente_a: stato?.corrente_a ?? null
    };
  });

  const totalWatts = rows.reduce<number | null>((total, row) => {
    if (row.potenza_w == null) return total;
    return (total ?? 0) + row.potenza_w;
  }, null);

  const erroredCount = statoResults.filter((result) => result.isError).length;
  const latestUpdateMs = statoResults.reduce((max, result) => Math.max(max, result.dataUpdatedAt ?? 0), 0);
  const measuredCount = rows.filter((row) => row.potenza_w != null).length;

  return (
    <div className="space-y-4">
      <div className="land:hidden">
        <InlineNotice>
          Monitor del consumo istantaneo dei dispositivi con power meter (PM e Shelly 1PM): ogni barra è un dispositivo, la barra del riquadro in alto è il totale. Le misure sono lette in tempo reale e non vengono registrate.
        </InlineNotice>
      </div>

      {monitors.length === 0 && (
        <section className="app-card">
          <EmptyState>Nessun dispositivo con power meter configurato nel file shelly.json.</EmptyState>
        </section>
      )}

      {erroredCount > 0 && (
        <InlineNotice tone="warning">
          {erroredCount} dispositivo/ei non rispondono: il totale considera solo gli ultimi dati disponibili.
        </InlineNotice>
      )}

      <div className="grid gap-4 land:grid-cols-[22rem_minmax(0,1fr)] land:items-start">
        <form className="app-card" onSubmit={applyInterval}>
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="section-title mb-0">Totale consumo istantaneo</h2>
              <p className="mt-2 text-[2.6rem] font-bold leading-none tabular-nums tracking-tight land:text-[2.75rem]" style={{ color: monitorColor(totalWatts) }}>
                {totalWatts == null ? '—' : totalWatts.toFixed(1)}
                <span className="ml-2 text-base font-semibold tracking-normal text-slate-400">watt</span>
              </p>
              <p className="mt-2 text-xs text-slate-400">
                somma delle ultime misure di {measuredCount} dispositivi con power meter · {appliedInterval} s · aggiorna
              </p>
            </div>
            <div role="status" aria-label="Totale consumo istantaneo">
              <TotalRing watts={totalWatts} />
            </div>
          </div>
          <TotalBar watts={totalWatts} />
          {monitors.length > 0 && scaleLegend()}
          {latestUpdateMs > 0 && (
            <p className="mt-2 text-right text-xs text-slate-400">ultimo aggiornamento {formatWallClockDateTime(latestUpdateMs)}</p>
          )}
          <div className="mt-3 land:mt-2 space-y-2 land:space-y-1.5 border-t border-slate-700/70 pt-3 land:pt-2">
            <div className="flex items-end gap-3">
              <label className="min-w-0 flex-1">
                <span className="field-label">Aggiorna ogni</span>
                <span className="mt-1.5 land:mt-1 flex items-center gap-2">
                  <input
                    className="field-input field-input-left"
                    type="number"
                    min={1}
                    step={1}
                    value={intervalText}
                    onChange={(event) => setIntervalText(event.target.value)}
                    aria-label="Intervallo di aggiornamento in secondi"
                  />
                  <span className="whitespace-nowrap text-sm text-slate-400">secondi</span>
                </span>
              </label>
              <button className="btn-secondary shrink-0" type="submit">Applica</button>
              <span className="inline-flex shrink-0 items-center gap-1.5 self-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold tracking-widest text-emerald-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                LIVE
              </span>
            </div>
            {intervalError && <InlineNotice tone="warning">{intervalError}</InlineNotice>}
            <p className="text-xs text-slate-400">Rilettura live sui dispositivi: nessuna modifica alla configurazione.</p>
          </div>
          <p className="mt-2 hidden text-[11px] leading-snug text-slate-400 land:block">
            <span className="font-semibold text-slate-200">Barra in alto</span> = totale casa ·{' '}
            <span className="font-semibold text-slate-200">scala</span> fissa 0–{MONITOR_MAX_W} W ·{' '}
            <span className="font-semibold text-slate-200">colore</span> = potenza del dispositivo.
          </p>
        </form>

        {monitors.length > 0 && (
          <section className="app-card">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="section-title mb-0">Dispositivi</h2>
              <span className="rounded-md border border-slate-600 px-2 py-0.5 text-xs text-slate-400">{monitors.length} con misure</span>
            </div>
            <div data-chart-layout={isWide ? 'horizontal' : 'vertical'}>
              {rows.map((row) => (
                <MonitorBar key={row.id} row={row} totalWatts={totalWatts} />
              ))}
            </div>
          </section>
        )}

        <section className="app-card land:hidden">
          <h2 className="section-title">Come si legge</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <dl className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-400">Barra in alto</dt>
                <dd className="font-semibold text-slate-100">totale casa</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-400">Lunghezza barra</dt>
                <dd className="font-semibold text-slate-100">scala fissa 0–{MONITOR_MAX_W} W</dd>
              </div>
            </dl>
            <dl className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-400">Colore barra</dt>
                <dd className="font-semibold text-slate-100">potenza del dispositivo</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-400">Valore a destra</dt>
                <dd className="font-semibold text-slate-100">watt e quota</dd>
              </div>
            </dl>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Oltre {MONITOR_MAX_W} W la barra satura e passa al rosso: la quota resta leggibile a destra.
          </p>
        </section>
      </div>
    </div>
  );
}
