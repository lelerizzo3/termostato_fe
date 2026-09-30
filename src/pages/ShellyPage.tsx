import { useState } from 'react';
import type { ShellyDevice, ShellyRelayStato, ShellyStato } from '../api/types';
import { useShellyDevices, useShellyRelayCommand, useShellyStato } from '../hooks/useApi';
import { formatCorrente, formatPotenza, formatTensione, hasPowerMeter, hasRelay } from '../lib/shelly';
import { EmptyState, ErrorState, InlineNotice, LoadingState } from '../components/common/States';

export function ShellyPage() {
  const devices = useShellyDevices();

  if (devices.isLoading) return <LoadingState label="Caricamento dispositivi Shelly…" />;
  if (devices.isError || !devices.data) return <ErrorState error={devices.error} onRetry={() => void devices.refetch()} />;

  const relays = devices.data.filter((device) => hasRelay(device.tipo));
  const monitors = devices.data.filter((device) => !hasRelay(device.tipo));

  return (
    <div className="space-y-4">
      <InlineNotice>
        I dispositivi Shelly vengono interrogati ai loro IP reali nella rete locale, indipendentemente dal profilo backend: con il profilo `mock` restano simulati solo il sensore e il relay del termostato. Lo stato è letto in tempo reale, senza storico.
      </InlineNotice>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{devices.data.length} dispositivi configurati</p>
        <button className="btn-secondary" type="button" onClick={() => void devices.refetch()} disabled={devices.isFetching}>
          {devices.isFetching ? 'Aggiornamento…' : '↻ Aggiorna'}
        </button>
      </div>

      {devices.data.length === 0 && <EmptyState>Nessun dispositivo Shelly configurato nel file shelly.json.</EmptyState>}

      {relays.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="section-title mb-0">Relay comandabili</h2>
            <span className="rounded-md border border-slate-600 px-2 py-0.5 text-xs text-slate-400">{relays.length}</span>
          </div>
          <div className="space-y-3">
            {relays.map((device) => <RelayCard key={device.id} device={device} />)}
          </div>
        </section>
      )}

      {monitors.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="section-title mb-0">Power monitor</h2>
            <span className="rounded-md border border-slate-600 px-2 py-0.5 text-xs text-slate-400">{monitors.length}</span>
          </div>
          <div className="space-y-3">
            {monitors.map((device) => <PowerMeterCard key={device.id} device={device} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function RelayCard({ device }: { device: ShellyDevice }) {
  const state = useShellyStato(device.id);
  const command = useShellyRelayCommand(device.id);
  const [conferma, setConferma] = useState<ShellyRelayStato | null>(null);

  const on = state.data?.acceso === true;
  const statoNoto = state.data?.acceso != null;
  const busy = state.isLoading || state.isFetching || command.isPending;

  async function toggle() {
    setConferma(null);
    try {
      const stato = await command.mutateAsync(!on);
      if (stato.esito !== false) setConferma(stato);
      void state.refetch();
      window.setTimeout(() => void state.refetch(), 3000);
    } catch {
      // l'errore viene reso da `command.isError` sotto la card
    }
  }

  const confermaTesto = conferma ? confermaRelayDescrizione(conferma) : null;
  const misure = hasPowerMeter(device.tipo) ? state.data : null;

  return (
    <article className={`app-card ${on ? 'border-emerald-500/50' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-100">{device.nome}</h3>
          <p className="mt-0.5 text-xs text-slate-400">{device.modello} · gen. {device.generazione} · {device.ip}</p>
        </div>
        <RelayBadge acceso={state.data?.acceso ?? null} loading={state.isLoading && !state.data} failed={state.isError && !state.data} />
      </div>

      {misure && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Metric label="Potenza" value={formatPotenza(misure.potenza_w)} />
          <Metric label="Tensione" value={formatTensione(misure.tensione_v)} />
          <Metric label="Corrente" value={formatCorrente(misure.corrente_a)} />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs leading-5 text-slate-400">
          {state.isError ? 'Stato dispositivo non disponibile.' : statoNoto ? 'Stato letto dal dispositivo in tempo reale.' : 'Stato del relè non disponibile.'}
        </p>
        <button className={on ? 'btn-secondary shrink-0' : 'btn-primary shrink-0'} type="button" onClick={() => void toggle()} disabled={busy || !statoNoto}>
          {command.isPending ? 'Invio…' : on ? 'Spegni' : 'Accendi'}
        </button>
      </div>
      {command.isError && <InlineNotice tone="warning">{command.error instanceof Error ? command.error.message : 'Comando non riuscito.'}</InlineNotice>}
      {confermaTesto && (
        <InlineNotice tone="success" role="status">
          {confermaTesto.esito}{confermaTesto.transizione ? ` · ${confermaTesto.transizione}` : ''}
        </InlineNotice>
      )}
    </article>
  );
}

function RelayBadge({ acceso, loading, failed }: { acceso: boolean | null; loading: boolean; failed: boolean }) {
  if (loading) return <span className="rounded-full bg-slate-700 px-3 py-1 text-sm font-bold text-slate-300">…</span>;
  if (failed) return <span className="rounded-full bg-slate-700 px-3 py-1 text-sm font-bold text-slate-400">ERRORE</span>;
  if (acceso == null) return <span className="rounded-full bg-slate-700 px-3 py-1 text-sm font-bold text-slate-400">—</span>;
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-bold ${acceso ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
      {acceso ? 'ACCESO' : 'SPENTO'}
    </span>
  );
}

function confermaRelayDescrizione(stato: ShellyRelayStato): { esito: string; transizione: string | null } {
  const transizione =
    stato.stato_precedente == null
      ? null
      : stato.stato_precedente === stato.acceso
        ? (stato.acceso ? 'era già acceso' : 'era già spento')
        : (stato.acceso ? 'da spento ad acceso' : 'da acceso a spento');
  return { esito: 'Comando eseguito', transizione };
}

function PowerMeterCard({ device }: { device: ShellyDevice }) {
  const state = useShellyStato(device.id);
  const misure: ShellyStato | undefined = state.data;

  return (
    <article className="app-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-100">{device.nome}</h3>
          <p className="mt-0.5 text-xs text-slate-400">{device.modello} · gen. {device.generazione} · {device.ip}</p>
        </div>
        <span className="rounded-md border border-slate-600 px-2 py-0.5 text-xs text-slate-400">{device.tipo}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Metric label="Potenza" value={formatPotenza(misure?.potenza_w)} />
        <Metric label="Tensione" value={formatTensione(misure?.tensione_v)} />
        <Metric label="Corrente" value={formatCorrente(misure?.corrente_a)} />
      </div>
      <div className="mt-3">
        <p className="text-xs leading-5 text-slate-400">
          {state.isError ? 'Misura non disponibile.' : 'Misura letta dal dispositivo in tempo reale, senza storico.'}
        </p>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 px-2 py-3">
      <p className="text-[11px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-100">{value}</p>
    </div>
  );
}
