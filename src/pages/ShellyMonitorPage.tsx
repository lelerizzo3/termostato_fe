import { FormEvent, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useQueries } from '@tanstack/react-query';
import { getShellyStato } from '../api/endpoints';
import { queryKeys, useShellyDevices } from '../hooks/useApi';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { formatWallClockDateTime } from '../lib/datetime';
import { LANDSCAPE_TABLET_QUERY } from '../lib/layout';
import { formatCorrente, formatPotenza, formatTensione, hasPowerMeter } from '../lib/shelly';
import { MONITOR_MAX_W, monitorColor } from '../lib/shellyMonitor';
import { EmptyState, ErrorState, InlineNotice, LoadingState } from '../components/common/States';

interface MonitorBar {
  id: string;
  nome: string;
  potenza_w: number | null;
  tensione_v: number | null;
  corrente_a: number | null;
}

const DEFAULT_INTERVAL_SECONDS = 5;
const NAME_MAX_CHARS = 18;

function formatWattsLabel(value: string | number): string {
  const watts = Number(value);
  return Number.isFinite(watts) ? `${Math.round(watts)}W` : '—';
}

function truncateName(nome: string): string {
  return nome.length > NAME_MAX_CHARS ? `${nome.slice(0, NAME_MAX_CHARS - 1)}…` : nome;
}

function MonitorTooltip() {
  return (
    <Tooltip
      cursor={{ fill: '#334155', opacity: 0.4 }}
      formatter={(value) => {
        const watts = typeof value === 'number' ? value : null;
        return [watts == null ? '—' : `${watts.toFixed(1)} W`, 'Potenza'];
      }}
      labelFormatter={(label) => String(label)}
      contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: 12 }}
    />
  );
}

interface ChartSize {
  width?: number;
  height?: number;
}

function VerticalBarsChart({ bars, width, height }: { bars: MonitorBar[] } & ChartSize) {
  return (
    <BarChart data={bars} width={width} height={height} margin={{ top: 24, right: 8, left: -6, bottom: 0 }} barCategoryGap="18%">
      <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="nome" stroke="#94a3b8" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
      <YAxis domain={[0, MONITOR_MAX_W]} stroke="#94a3b8" tick={{ fontSize: 10 }} tickFormatter={(value: number) => `${value}W`} />
      <MonitorTooltip />
      <Bar dataKey="potenza_w" radius={[6, 6, 0, 0]} maxBarSize={52} isAnimationActive={false}>
        <LabelList
          dataKey="potenza_w"
          position="top"
          formatter={formatWattsLabel}
          fill="#94a3b8"
          fontSize={10}
        />
        {bars.map((bar) => (
          <Cell key={bar.id} fill={monitorColor(bar.potenza_w)} />
        ))}
      </Bar>
    </BarChart>
  );
}

function HorizontalBarsChart({ bars, width, height }: { bars: MonitorBar[] } & ChartSize) {
  return (
    <BarChart layout="vertical" data={bars} width={width} height={height} margin={{ top: 4, right: 64, left: 4, bottom: 0 }} barCategoryGap="22%">
      <CartesianGrid stroke="#334155" strokeDasharray="3 3" horizontal={false} />
      <XAxis type="number" domain={[0, MONITOR_MAX_W]} stroke="#94a3b8" tick={{ fontSize: 10 }} tickFormatter={(value: number) => `${value}W`} />
      <YAxis type="category" dataKey="nome" stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={truncateName} width={124} interval={0} />
      <MonitorTooltip />
      <Bar dataKey="potenza_w" radius={[0, 6, 6, 0]} maxBarSize={26} isAnimationActive={false}>
        <LabelList
          dataKey="potenza_w"
          position="right"
          formatter={formatWattsLabel}
          fill="#94a3b8"
          fontSize={11}
        />
        {bars.map((bar) => (
          <Cell key={bar.id} fill={monitorColor(bar.potenza_w)} />
        ))}
      </Bar>
    </BarChart>
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

  const bars: MonitorBar[] = monitors.map((device, index) => {
    const stato = statoResults[index]?.data;
    return {
      id: device.id,
      nome: device.nome,
      potenza_w: stato?.potenza_w ?? null,
      tensione_v: stato?.tensione_v ?? null,
      corrente_a: stato?.corrente_a ?? null
    };
  });

  const totalWatts = bars.reduce<number | null>((total, bar) => {
    if (bar.potenza_w == null) return total;
    return (total ?? 0) + bar.potenza_w;
  }, null);

  const erroredCount = statoResults.filter((result) => result.isError).length;
  const latestUpdateMs = statoResults.reduce((max, result) => Math.max(max, result.dataUpdatedAt ?? 0), 0);

  return (
    <div className="space-y-4 land:grid land:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] land:items-start land:gap-4 land:space-y-0">
      <div className="land:hidden">
        <InlineNotice>
          Monitor del consumo istantaneo dei dispositivi con power meter (PM e Shelly 1PM): mostra la somma delle ultime letture, con colore che cambia in base alla potenza totale. Le misure sono lette in tempo reale sui dispositivi e non vengono registrate.
        </InlineNotice>
      </div>

      <div className="space-y-4">
        <form className="app-card space-y-3" onSubmit={applyInterval}>
          <div>
            <h2 className="section-title mb-0">Aggiornamento</h2>
            <p className="mt-0.5 text-xs text-slate-400">Ogni quanti secondi rileggere il consumo istantaneo dei power monitor.</p>
          </div>
          <div className="flex items-end gap-3">
            <label className="flex-1">
              <span className="field-label">Aggiorna ogni</span>
              <span className="mt-2 flex items-center gap-2">
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
          </div>
          {intervalError && <InlineNotice tone="warning">{intervalError}</InlineNotice>}
        </form>

        <section className="app-card">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="section-title mb-0">Totale consumo istantaneo</h2>
              <p className="mt-0.5 text-xs text-slate-400">Somma delle ultime misure dei {monitors.length} dispositivi con power meter.</p>
            </div>
            <span className="rounded-md border border-slate-600 px-2 py-0.5 text-xs text-slate-400">{appliedInterval} s · aggiorna</span>
          </div>

          {monitors.length === 0 && <EmptyState>Nessun dispositivo con power meter configurato nel file shelly.json.</EmptyState>}

          {erroredCount > 0 && (
            <InlineNotice tone="warning">
              {erroredCount} dispositivo/ei non rispondono: il totale considera solo gli ultimi dati disponibili.
            </InlineNotice>
          )}

          {monitors.length > 0 && (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 px-4 py-8 text-center land:py-10" role="status" aria-label="Totale consumo istantaneo">
              {totalWatts == null ? (
                <span className="text-5xl font-bold tabular-nums text-slate-500">—</span>
              ) : (
                <>
                  <span className="text-6xl font-bold tabular-nums leading-none" style={{ color: monitorColor(totalWatts) }}>
                    {totalWatts.toFixed(1)}
                  </span>
                  <span className="mt-2 block text-sm font-medium text-slate-400">watt totali</span>
                </>
              )}
            </div>
          )}

          {latestUpdateMs > 0 && (
            <p className="mt-2 text-right text-xs text-slate-400">ultimo aggiornamento {formatWallClockDateTime(latestUpdateMs)}</p>
          )}

          {monitors.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: monitorColor(40) }} />{'<'} 100 W</span>
              <span className="font-semibold text-slate-200">▬</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: monitorColor(1000) }} />verso arancione</span>
              <span className="font-semibold text-slate-200">▬</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: monitorColor(2500) }} />≥ 2000 W</span>
            </div>
          )}
        </section>
      </div>

      <section className="app-card">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="section-title mb-0">Dettaglio per dispositivo</h2>
          <span className="rounded-md border border-slate-600 px-2 py-0.5 text-xs text-slate-400">{monitors.length} con misure</span>
        </div>

        {monitors.length > 0 && (
          <>
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3" data-chart-layout={isWide ? 'horizontal' : 'vertical'}>
              <div className="h-[300px] w-full land:h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  {isWide ? <HorizontalBarsChart bars={bars} /> : <VerticalBarsChart bars={bars} />}
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-3 space-y-2 land:grid land:grid-cols-2 land:gap-x-4 land:gap-y-2">
              {bars.map((bar) => (
                <div key={bar.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-slate-200">
                    <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: monitorColor(bar.potenza_w) }} />
                    <span className="min-w-0">
                      <span className="block truncate">{bar.nome}</span>
                      <span className="block truncate text-[11px] tabular-nums text-slate-400">
                        {formatTensione(bar.tensione_v)} · {formatCorrente(bar.corrente_a)}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-100">{formatPotenza(bar.potenza_w)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
