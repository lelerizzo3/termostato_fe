import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useConfiguration, useUpdateConfiguration } from '../hooks/useApi';
import type { SystemConfiguration } from '../api/types';
import { ErrorState, FieldError, InlineNotice, LoadingState } from '../components/common/States';

const decimal = z.coerce.number().refine((value) => Number.isFinite(value) && Math.abs(value * 10 - Math.round(value * 10)) < 1e-8, 'Usa una sola cifra decimale.');
const nonNegativeDecimal = z.coerce.number().min(0, 'Non può essere negativa.').refine((value) => Math.abs(value * 10 - Math.round(value * 10)) < 1e-8, 'Usa una sola cifra decimale.');
const positiveInteger = z.coerce.number().int('Inserisci un numero intero.').min(1, 'Il valore deve essere maggiore di zero.');

const configurationSchema = z.object({
  soglia_attivazione: nonNegativeDecimal,
  override_attivo: z.boolean(),
  temperatura_override: z.union([decimal, z.null()]),
  intervallo_polling_secondi: positiveInteger,
  max_errori_consecutivi: positiveInteger,
  retention_log_giorni: positiveInteger,
  ntfy_url: z.string().url('Inserisci un URL valido.'),
  ntfy_topic: z.string().min(1, 'Obbligatorio.'),
  debug_mode: z.boolean(),
  notifiche_errori_abilitate: z.boolean(),
  meteo_esterno_url: z.string().url('Inserisci un URL valido.'),
  meteo_esterno_latitudine: z.coerce.number().min(-90, 'Latitudine non valida.').max(90, 'Latitudine non valida.'),
  meteo_esterno_longitudine: z.coerce.number().min(-180, 'Longitudine non valida.').max(180, 'Longitudine non valida.'),
  sensore_url: z.string().url('Inserisci un URL valido.'),
  relay_url: z.string().url('Inserisci un URL valido.'),
  database_path: z.string().min(1),
  api_keys: z.array(z.string().min(1, 'La chiave non può essere vuota.'))
}).superRefine((value, context) => {
  if (value.override_attivo && value.temperatura_override === null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['temperatura_override'], message: 'Obbligatoria quando l’override è attivo.' });
  }
});

type ConfigurationForm = z.infer<typeof configurationSchema>;

export function ConfigPage() {
  const configuration = useConfiguration();
  const update = useUpdateConfiguration();
  const form = useForm<ConfigurationForm>({
    resolver: zodResolver(configurationSchema),
    defaultValues: {
      soglia_attivazione: 0.3,
      override_attivo: false,
      temperatura_override: null,
      intervallo_polling_secondi: 60,
      max_errori_consecutivi: 3,
      retention_log_giorni: 30,
      ntfy_url: '',
      ntfy_topic: '',
      debug_mode: false,
      notifiche_errori_abilitate: true,
      meteo_esterno_url: 'https://api.open-meteo.com',
      meteo_esterno_latitudine: 37.6167,
      meteo_esterno_longitudine: 15.1667,
      sensore_url: '',
      relay_url: '',
      database_path: '',
      api_keys: []
    }
  });
  const apiKeys = form.watch('api_keys');
  const overrideActive = form.watch('override_attivo');

  useEffect(() => {
    if (configuration.data) form.reset(configuration.data);
  }, [configuration.data, form]);

  if (configuration.isLoading) return <LoadingState label="Caricamento configurazione…" />;
  if (configuration.isError || !configuration.data) return <ErrorState error={configuration.error} onRetry={() => void configuration.refetch()} />;

  async function submit(values: ConfigurationForm) {
    const payload: SystemConfiguration = {
      ...values,
      temperatura_override: values.override_attivo ? (values.temperatura_override as number | null) : null
    };
    await update.mutateAsync(payload);
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
      {update.isSuccess && <InlineNotice tone="success">Configurazione salvata.</InlineNotice>}
      {update.isError && <InlineNotice tone="warning">{update.error instanceof Error ? update.error.message : 'Salvataggio non riuscito.'}</InlineNotice>}

      <section className="app-card">
        <h2 className="section-title">Regolazione</h2>
        <NumberField label="Soglia attivazione (°C)" step="0.1" registration={form.register('soglia_attivazione')} error={form.formState.errors.soglia_attivazione?.message} />
        <NumberField label="Intervallo polling (secondi)" step="1" registration={form.register('intervallo_polling_secondi')} error={form.formState.errors.intervallo_polling_secondi?.message} />
      </section>

      <section className="app-card">
        <h2 className="section-title">Override manuale</h2>
        <ToggleRow label="Override attivo" registration={form.register('override_attivo')} />
        <NumberField label="Temperatura override (°C)" step="0.1" disabled={!overrideActive} registration={form.register('temperatura_override', { setValueAs: (value) => value === '' ? null : Number(value) })} error={form.formState.errors.temperatura_override?.message} />
        <p className="mt-2 text-xs text-slate-400">Quando attivo, il calendario viene ignorato.</p>
      </section>

      <section className="app-card">
        <h2 className="section-title">Sicurezza e log</h2>
        <NumberField label="Max errori consecutivi" step="1" registration={form.register('max_errori_consecutivi')} error={form.formState.errors.max_errori_consecutivi?.message} />
        <NumberField label="Retention log (giorni)" step="1" registration={form.register('retention_log_giorni')} error={form.formState.errors.retention_log_giorni?.message} />
      </section>

      <section className="app-card">
        <h2 className="section-title">Notifiche ntfy</h2>
        <TextField label="URL ntfy" registration={form.register('ntfy_url')} error={form.formState.errors.ntfy_url?.message} />
        <TextField label="Topic" registration={form.register('ntfy_topic')} error={form.formState.errors.ntfy_topic?.message} />
        <ToggleRow label="Notifiche errore ntfy abilitate" registration={form.register('notifiche_errori_abilitate')} />
        <ToggleRow label="Debug mode (notifiche accensione/spegnimento)" registration={form.register('debug_mode')} />
      </section>

      <section className="app-card">
        <h2 className="section-title">Meteo esterno</h2>
        <TextField label="URL servizio meteo" registration={form.register('meteo_esterno_url')} error={form.formState.errors.meteo_esterno_url?.message} />
        <NumberField label="Latitudine" step="0.0001" registration={form.register('meteo_esterno_latitudine')} error={form.formState.errors.meteo_esterno_latitudine?.message} />
        <NumberField label="Longitudine" step="0.0001" registration={form.register('meteo_esterno_longitudine')} error={form.formState.errors.meteo_esterno_longitudine?.message} />
      </section>

      <section className="app-card">
        <h2 className="section-title">Integrazioni</h2>
        <TextField label="URL sensore" registration={form.register('sensore_url')} error={form.formState.errors.sensore_url?.message} />
        <TextField label="URL relay" registration={form.register('relay_url')} error={form.formState.errors.relay_url?.message} />
      </section>

      <section className="app-card">
        <h2 className="section-title">Database</h2>
        <TextField label="Percorso database (solo lettura)" registration={form.register('database_path')} readOnly error={form.formState.errors.database_path?.message} />
        <p className="mt-2 text-xs leading-5 text-slate-400">Bootstrap-only: deve essere rispedito invariato e si modifica solo al riavvio.</p>
      </section>

      <section className="app-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="section-title mb-0">API-key autorizzate dal backend</h2>
          <button className="btn-secondary min-h-9 px-3 py-1 text-sm" type="button" onClick={() => form.setValue('api_keys', [...apiKeys, ''], { shouldDirty: true })}>+ Aggiungi</button>
        </div>
        <div className="space-y-2">
          {apiKeys.map((_, index) => (
            <div className="flex gap-2" key={`api-key-${index}`}>
              <input className="field-input field-input-left" type="password" autoComplete="off" {...form.register(`api_keys.${index}`)} placeholder="Chiave backend" />
              <button className="btn-danger min-h-11 px-3" type="button" aria-label={`Rimuovi chiave ${index + 1}`} onClick={() => form.setValue('api_keys', apiKeys.filter((_, itemIndex) => itemIndex !== index), { shouldDirty: true })}>×</button>
            </div>
          ))}
          {apiKeys.length === 0 && <p className="text-sm text-slate-400">Nessuna chiave configurata (fail-closed).</p>}
        </div>
        {form.formState.errors.api_keys?.root?.message && <FieldError message={form.formState.errors.api_keys.root.message} />}
      </section>

      <button className="btn-primary w-full" type="submit" disabled={update.isPending}>
        {update.isPending ? 'Salvataggio…' : 'Salva configurazione'}
      </button>
    </form>
  );
}

function NumberField({ label, step, registration, error, disabled = false }: { label: string; step: string; registration: any; error?: string; disabled?: boolean }) {
  return (
    <label className="block border-b border-slate-700 py-3 last:border-0">
      <span className="field-label">{label}</span>
      <input className="field-input mt-2" type="number" step={step} disabled={disabled} {...registration} />
      <FieldError message={error} />
    </label>
  );
}

function TextField({ label, registration, error, disabled = false, readOnly = false }: { label: string; registration: any; error?: string; disabled?: boolean; readOnly?: boolean }) {
  return (
    <label className="block border-b border-slate-700 py-3 last:border-0">
      <span className="field-label">{label}</span>
      <input className="field-input field-input-left mt-2" type="text" disabled={disabled} readOnly={readOnly} {...registration} />
      <FieldError message={error} />
    </label>
  );
}

function ToggleRow({ label, registration }: { label: string; registration: any }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between border-b border-slate-700 py-3">
      <span className="field-label">{label}</span>
      <input className="peer sr-only" type="checkbox" {...registration} />
      <span className="relative h-7 w-12 rounded-full bg-slate-600 transition peer-checked:bg-orange-500 peer-focus-visible:ring-2 peer-focus-visible:ring-orange-300 after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}
