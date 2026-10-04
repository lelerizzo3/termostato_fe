import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../api/client';
import type { SystemConfiguration } from '../api/types';
import { ConfigPage } from './ConfigPage';

const baseConfig: SystemConfiguration = {
  soglia_attivazione: 0.3,
  override_attivo: false,
  temperatura_override: null,
  override_fine: null,
  intervallo_polling_secondi: 2,
  max_errori_consecutivi: 3,
  retention_log_giorni: 30,
  ntfy_url: 'https://ntfy.sh',
  ntfy_topic: 'sliverd',
  debug_mode: false,
  fuso_orario: 'Europe/Rome',
  ora_legale: true,
  notifiche_errori_abilitate: false,
  meteo_esterno_url: 'https://api.open-meteo.com',
  meteo_esterno_latitudine: 37.6167,
  meteo_esterno_longitudine: 15.1667,
  sensore_url: 'http://localhost:8080',
  relay_url: 'http://localhost:8080',
  database_path: './data/mock-termostato.db',
  api_keys: ['e2e-test-key'],
  alert_soglia: 0,
  alert_polling: 0
};

const refetch = vi.fn();
const mutateAsync = vi.fn();

let configuration: SystemConfiguration = baseConfig;
let updateError: Error | null = null;

vi.mock('../hooks/useApi', () => ({
  useConfiguration: () => ({
    isLoading: false,
    isError: false,
    isFetching: false,
    dataUpdatedAt: Date.now(),
    data: configuration,
    refetch
  }),
  useUpdateConfiguration: () => {
    const [error, setError] = useState<Error | null>(null);
    return {
      isPending: false,
      isSuccess: false,
      isError: error != null,
      error,
      mutateAsync: async (payload: SystemConfiguration) => {
        mutateAsync(payload);
        if (updateError) {
          setError(updateError);
          throw updateError;
        }
        configuration = payload;
        setError(null);
        return payload;
      }
    };
  },
  useCalendar: () => ({ isLoading: false, isError: false, data: undefined, refetch })
}));

beforeEach(() => {
  configuration = structuredClone(baseConfig);
  updateError = null;
  mutateAsync.mockClear();
  refetch.mockClear();
});

function sogliaInput() {
  return screen.getByRole('spinbutton', { name: /Soglia di consumo/ });
}

function pollingInput() {
  return screen.getByRole('spinbutton', { name: /Controllo ogni/ });
}

function saveButton() {
  return screen.getByRole('button', { name: 'Salva configurazione' });
}

/** Salta la validazione vincolante del browser per verificare anche lo schema Zod. */
function submitBypassingConstraintValidation() {
  fireEvent.submit(screen.getByRole('button', { name: 'Salva configurazione' }).closest('form') as HTMLFormElement);
}

async function replaceValue(user: ReturnType<typeof userEvent.setup>, input: HTMLElement, value: string) {
  await user.clear(input);
  await user.type(input, value);
}

describe('ConfigPage — alert di consumo', () => {
  it('mostra i due campi con i valori letti da GET /config', () => {
    configuration = { ...baseConfig, alert_soglia: 1500.75, alert_polling: 30 };
    render(<ConfigPage />);
    expect(sogliaInput()).toHaveValue(1500.75);
    expect(pollingInput()).toHaveValue(30);
  });

  it('espone min=0 su entrambi i campi e step intero solo sul polling', () => {
    render(<ConfigPage />);
    expect(sogliaInput()).toHaveAttribute('min', '0');
    expect(pollingInput()).toHaveAttribute('min', '0');
    expect(pollingInput()).toHaveAttribute('step', '1');
  });

  it('segnala l’alert disabilitato quando entrambi i valori sono zero', () => {
    render(<ConfigPage />);
    expect(screen.getByRole('status')).toHaveTextContent('Alert disabilitato');
  });

  it('spiega che servono entrambi i valori maggiori di zero', () => {
    render(<ConfigPage />);
    expect(screen.getByText(/entrambi i valori maggiori di zero/i)).toBeInTheDocument();
    expect(screen.getByText(/nessun dispositivo viene interrogato|non attivano nulla/i)).toBeInTheDocument();
  });

  it('considera disabilitato l’alert con la sola soglia impostata', async () => {
    const user = userEvent.setup();
    render(<ConfigPage />);
    await replaceValue(user, sogliaInput(), '2000');
    expect(sogliaInput()).toHaveValue(2000);
    expect(pollingInput()).toHaveValue(0);
    expect(screen.getByRole('status')).toHaveTextContent('Alert disabilitato');
  });

  it('considera disabilitato l’alert con il solo intervallo impostato', async () => {
    const user = userEvent.setup();
    render(<ConfigPage />);
    await replaceValue(user, pollingInput(), '30');
    expect(screen.getByRole('status')).toHaveTextContent('Alert disabilitato');
  });

  it('segnala l’alert attivo solo con soglia e intervallo entrambi positivi', async () => {
    const user = userEvent.setup();
    render(<ConfigPage />);
    await replaceValue(user, sogliaInput(), '1500.75');
    await replaceValue(user, pollingInput(), '30');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Alert attivo');
    expect(status).toHaveTextContent('1500.75 W');
    expect(status).toHaveTextContent('30 secondi');
  });

  it('reinvia entrambi i campi nel PUT anche se non modificati', async () => {
    const user = userEvent.setup();
    configuration = { ...baseConfig, alert_soglia: 1500.75, alert_polling: 30 };
    render(<ConfigPage />);
    await user.type(screen.getByRole('textbox', { name: /Topic/ }), 'x');
    await user.click(saveButton());
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ alert_soglia: 1500.75, alert_polling: 30 });
  });

  it('manda nel PUT i valori modificati, con soglia decimale accettata', async () => {
    const user = userEvent.setup();
    render(<ConfigPage />);
    await replaceValue(user, sogliaInput(), '1500.75');
    await replaceValue(user, pollingInput(), '30');
    await user.click(saveButton());
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ alert_soglia: 1500.75, alert_polling: 30 });
  });

  it('non azzera l’alert quando si salva un altro campo della configurazione', async () => {
    const user = userEvent.setup();
    configuration = { ...baseConfig, alert_soglia: 2000, alert_polling: 45 };
    render(<ConfigPage />);
    await replaceValue(user, screen.getByRole('spinbutton', { name: /Retention log/ }), '15');
    await user.click(saveButton());
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ alert_soglia: 2000, alert_polling: 45 });
  });

  it('blocca il salvataggio con una soglia negativa', async () => {
    const user = userEvent.setup();
    render(<ConfigPage />);
    await replaceValue(user, sogliaInput(), '-1');
    expect(sogliaInput()).toBeInvalid();
    await user.click(saveButton());
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('blocca il salvataggio con un intervallo negativo', async () => {
    const user = userEvent.setup();
    render(<ConfigPage />);
    await replaceValue(user, pollingInput(), '-5');
    expect(pollingInput()).toBeInvalid();
    await user.click(saveButton());
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('blocca il salvataggio con un intervallo decimale, che il backend troncherebbe', async () => {
    const user = userEvent.setup();
    render(<ConfigPage />);
    await replaceValue(user, pollingInput(), '2.5');
    expect((pollingInput() as HTMLInputElement).validity.stepMismatch).toBe(true);
    await user.click(saveButton());
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('rifiuta anche nello schema una soglia negativa', async () => {
    const user = userEvent.setup();
    render(<ConfigPage />);
    await replaceValue(user, sogliaInput(), '-1');
    submitBypassingConstraintValidation();
    expect(await screen.findByText('Non può essere negativo.')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('rifiuta anche nello schema un intervallo decimale', async () => {
    const user = userEvent.setup();
    render(<ConfigPage />);
    await replaceValue(user, pollingInput(), '2.5');
    submitBypassingConstraintValidation();
    expect(await screen.findByText('Inserisci un numero intero.')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('accetta zero come disattivazione esplicita dell’alert', async () => {
    const user = userEvent.setup();
    configuration = { ...baseConfig, alert_soglia: 1500.75, alert_polling: 30 };
    render(<ConfigPage />);
    await replaceValue(user, sogliaInput(), '0');
    await replaceValue(user, pollingInput(), '0');
    await user.click(saveButton());
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ alert_soglia: 0, alert_polling: 0 });
  });

  it('mostra il message del 400 del backend', async () => {
    const user = userEvent.setup();
    updateError = new ApiRequestError(
      'JSON parse error: Cannot construct instance of `com.termostato.domain.model.SystemConfiguration`, problem: alertSoglia non può essere negativo',
      400
    );
    render(<ConfigPage />);
    await replaceValue(user, sogliaInput(), '1');
    await replaceValue(user, pollingInput(), '30');
    await user.click(saveButton());
    expect(await screen.findByText(/alertSoglia non può essere negativo/)).toBeInTheDocument();
  });

  it('manda zero a un backend che non espone i due campi', async () => {
    const legacy = { ...baseConfig } as Partial<SystemConfiguration>;
    delete legacy.alert_soglia;
    delete legacy.alert_polling;
    configuration = legacy as SystemConfiguration;
    render(<ConfigPage />);
    expect(sogliaInput()).toHaveValue(0);
    expect(pollingInput()).toHaveValue(0);
    await userEvent.click(saveButton());
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ alert_soglia: 0, alert_polling: 0 });
  });
});