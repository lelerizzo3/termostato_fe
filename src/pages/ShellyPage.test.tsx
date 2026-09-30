import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShellyRelayStato, ShellyStato } from '../api/types';
import { ShellyPage } from './ShellyPage';

const refetch = vi.fn();

const devices = [
  { id: 'portone', nome: 'Portone', ip: '192.168.1.20', modello: 'Shelly 1', generazione: 1, tipo: 'RELAY' },
  { id: 'terrazzo', nome: 'Terrazzo', ip: '192.168.1.10', modello: 'S3SW-001X8EU', generazione: 3, tipo: 'RELAY' },
  { id: 'shelly1pm', nome: 'Shelly 1PM', ip: '192.168.1.21', modello: 'SHSW-PM', generazione: 1, tipo: 'PM_RELAY' },
  { id: 'frigo-e-forno', nome: 'Frigo e Forno', ip: '192.168.1.9', modello: 'SNPM-001PCEU16', generazione: 3, tipo: 'PM' }
] as const;

const statoIniziale: Record<string, ShellyStato> = {
  portone: { id: 'portone', nome: 'Portone', ip: '192.168.1.20', modello: 'Shelly 1', generazione: 1, tipo: 'RELAY', acceso: true, potenza_w: null, tensione_v: null, corrente_a: null },
  terrazzo: { id: 'terrazzo', nome: 'Terrazzo', ip: '192.168.1.10', modello: 'S3SW-001X8EU', generazione: 3, tipo: 'RELAY', acceso: false, potenza_w: null, tensione_v: null, corrente_a: null },
  shelly1pm: { id: 'shelly1pm', nome: 'Shelly 1PM', ip: '192.168.1.21', modello: 'SHSW-PM', generazione: 1, tipo: 'PM_RELAY', acceso: true, potenza_w: 45.2, tensione_v: 229.8, corrente_a: 0.197 },
  'frigo-e-forno': { id: 'frigo-e-forno', nome: 'Frigo e Forno', ip: '192.168.1.9', modello: 'SNPM-001PCEU16', generazione: 3, tipo: 'PM', acceso: null, potenza_w: 2100, tensione_v: 230.1, corrente_a: 9.13 }
};

let stato: Record<string, ShellyStato> = {};
let erroredIds = new Set<string>();
let commandImpl: ((id: string, on: boolean) => ShellyRelayStato) | null = null;

vi.mock('../hooks/useApi', () => ({
  useShellyDevices: () => ({
    isLoading: false,
    isError: false,
    isFetching: false,
    data: devices,
    refetch
  }),
  useShellyStato: (id: string) => ({
    isLoading: false,
    isError: erroredIds.has(id),
    isFetching: false,
    data: erroredIds.has(id) ? undefined : stato[id],
    refetch
  }),
  useShellyRelayCommand: (id: string) => {
    const [error, setError] = useState<Error | null>(null);
    return {
      isPending: false,
      isError: error != null,
      error,
      mutateAsync: async (on: boolean) => {
        try {
          const risposta = commandImpl ? await commandImpl(id, on) : {
            id,
            nome: id,
            ip: '192.168.1.10',
            modello: 'S3SW-001X8EU',
            generazione: 3,
            tipo: 'RELAY',
            acceso: on,
            esito: true,
            stato_precedente: null
          };
          setError(null);
          return risposta;
        } catch (e) {
          const err = e instanceof Error ? e : new Error('Errore sconosciuto');
          setError(err);
          throw err;
        }
      }
    };
  }
}));

beforeEach(() => {
  stato = structuredClone(statoIniziale);
  erroredIds = new Set();
  commandImpl = null;
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ShellyPage />
    </MemoryRouter>
  );
}

function cardOf(deviceName: string): HTMLElement {
  const card = screen.getByText(deviceName).closest('article');
  expect(card).not.toBeNull();
  return card as HTMLElement;
}

async function clickButtonInCard(user: ReturnType<typeof userEvent.setup>, deviceName: string, label: string) {
  await user.click(within(cardOf(deviceName)).getByRole('button', { name: label }));
}

describe('ShellyPage', () => {
  it('mostra le card relay con lo stato letto da /shelly/stato e le misure del PM_RELAY e del PM', () => {
    renderPage();
    expect(screen.getByText('Portone')).toBeInTheDocument();
    expect(screen.getByText('Terrazzo')).toBeInTheDocument();
    expect(within(cardOf('Portone')).getByText('ACCESO')).toBeInTheDocument();
    expect(within(cardOf('Terrazzo')).getByText('SPENTO')).toBeInTheDocument();
    expect(within(cardOf('Shelly 1PM')).getByText('45.2 W')).toBeInTheDocument();
    expect(within(cardOf('Shelly 1PM')).getByText('229.8 V')).toBeInTheDocument();
    expect(within(cardOf('Shelly 1PM')).getByText('0.20 A')).toBeInTheDocument();
    expect(within(cardOf('Frigo e Forno')).getByText('2100.0 W')).toBeInTheDocument();
  });

  it('non mostra misure sui relay senza power meter', () => {
    renderPage();
    const card = cardOf('Portone');
    expect(within(card).queryByText('Potenza')).not.toBeInTheDocument();
    expect(within(card).queryByText('0.0 W')).not.toBeInTheDocument();
  });

  it('mostra — invece di 0 quando le misure sono null', () => {
    stato['frigo-e-forno'] = { ...stato['frigo-e-forno'], potenza_w: null, tensione_v: null, corrente_a: null };
    renderPage();
    const card = cardOf('Frigo e Forno');
    expect(within(card).getAllByText('—')).toHaveLength(3);
    expect(within(card).queryByText('0.0 W')).not.toBeInTheDocument();
  });

  it('non mostra i comandi relay sui power monitor senza relè', () => {
    renderPage();
    const card = cardOf('Frigo e Forno');
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();
    expect(within(card).getByText('PM')).toBeInTheDocument();
  });

  it('mostra i comandi relay su un PM_RELAY, insieme alle misure', () => {
    renderPage();
    const card = cardOf('Shelly 1PM');
    expect(within(card).getByRole('button', { name: 'Spegni' })).toBeEnabled();
  });

  it('segnala lo stato non disponibile e disabilita il comando', () => {
    erroredIds.add('terrazzo');
    renderPage();
    const card = cardOf('Terrazzo');
    expect(within(card).getByText('ERRORE')).toBeInTheDocument();
    expect(within(card).getByText('Stato dispositivo non disponibile.')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Accendi' })).toBeDisabled();
  });
});

describe('ShellyPage — conferma esito comando relay', () => {
  it('conferma "Comando eseguito" per un Gen 1 senza stato_precedente, anche quando acceso resta false (auto-off)', async () => {
    const user = userEvent.setup();
    stato.portone = { ...stato.portone, acceso: false };
    commandImpl = () => ({
      id: 'portone',
      nome: 'Portone',
      ip: '192.168.1.20',
      modello: 'Shelly 1',
      generazione: 1,
      tipo: 'RELAY',
      acceso: false,
      esito: true,
      stato_precedente: null
    });
    renderPage();
    await clickButtonInCard(user, 'Portone', 'Accendi');
    expect(await screen.findByText('Comando eseguito')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mostra la transizione "da spento ad acceso" per terrazzo (Gen 3)', async () => {
    const user = userEvent.setup();
    commandImpl = (id) => ({ id, nome: 'Terrazzo', ip: '192.168.1.10', modello: 'S3SW-001X8EU', generazione: 3, tipo: 'RELAY', acceso: true, esito: true, stato_precedente: false });
    renderPage();
    await clickButtonInCard(user, 'Terrazzo', 'Accendi');
    const notice = await screen.findByRole('status');
    expect(within(notice).getByText('Comando eseguito · da spento ad acceso')).toBeInTheDocument();
  });

  it('mostra "Comando eseguito · da acceso a spento" per il comando off di terrazzo', async () => {
    const user = userEvent.setup();
    stato.terrazzo = { ...stato.terrazzo, acceso: true };
    commandImpl = (id) => ({ id, nome: 'Terrazzo', ip: '192.168.1.10', modello: 'S3SW-001X8EU', generazione: 3, tipo: 'RELAY', acceso: false, esito: true, stato_precedente: true });
    renderPage();
    await clickButtonInCard(user, 'Terrazzo', 'Spegni');
    expect(await screen.findByText('Comando eseguito · da acceso a spento')).toBeInTheDocument();
  });

  it('mostra "Comando eseguito · era già acceso" quando il relay era già nello stato richiesto', async () => {
    const user = userEvent.setup();
    commandImpl = (id) => ({ id, nome: 'Terrazzo', ip: '192.168.1.10', modello: 'S3SW-001X8EU', generazione: 3, tipo: 'RELAY', acceso: true, esito: true, stato_precedente: true });
    renderPage();
    await clickButtonInCard(user, 'Terrazzo', 'Accendi');
    expect(await screen.findByText('Comando eseguito · era già acceso')).toBeInTheDocument();
  });

  it('non mostra la conferma di successo quando esito è false', async () => {
    const user = userEvent.setup();
    commandImpl = (id) => ({ id, nome: 'Terrazzo', ip: '192.168.1.10', modello: 'S3SW-001X8EU', generazione: 3, tipo: 'RELAY', acceso: true, esito: false, stato_precedente: false });
    renderPage();
    await clickButtonInCard(user, 'Terrazzo', 'Accendi');
    expect(await screen.findByText('Portone')).toBeInTheDocument();
    expect(screen.queryByText('Comando eseguito')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('non mostra conferme di successo e mostra il messaggio ApiError sulle risposte non-2xx', async () => {
    const user = userEvent.setup();
    commandImpl = () => {
      throw new Error('Dispositivo Shelly non trovato: inesistente');
    };
    renderPage();
    await clickButtonInCard(user, 'Terrazzo', 'Accendi');
    expect(await screen.findByText('Dispositivo Shelly non trovato: inesistente')).toBeInTheDocument();
    expect(screen.queryByText('Comando eseguito')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
