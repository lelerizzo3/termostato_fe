import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMatchMedia } from '../test/matchMedia';
import { ShellyMonitorPage } from './ShellyMonitorPage';

const refetch = vi.fn();

const devices = [
  { id: 'frigo', nome: 'Frigo', ip: '192.168.1.9', modello: 'SNPM-001PCEU16', generazione: 3, tipo: 'PM' },
  { id: 'forno', nome: 'Forno', ip: '192.168.1.10', modello: 'SNPM-001PCEU16', generazione: 3, tipo: 'PM' },
  { id: 'shelly1pm', nome: 'Shelly 1PM', ip: '192.168.1.21', modello: 'SHSW-PM', generazione: 1, tipo: 'PM_RELAY' },
  { id: 'portone', nome: 'Portone', ip: '192.168.1.20', modello: 'Shelly 1', generazione: 1, tipo: 'RELAY' }
];

const statoPerId: Record<string, Record<string, unknown>> = {
  frigo: { id: 'frigo', nome: 'Frigo', ip: '192.168.1.9', modello: 'SNPM-001PCEU16', generazione: 3, tipo: 'PM', acceso: null, potenza_w: 45.2, tensione_v: 229.8, corrente_a: 0.197 },
  forno: { id: 'forno', nome: 'Forno', ip: '192.168.1.10', modello: 'SNPM-001PCEU16', generazione: 3, tipo: 'PM', acceso: null, potenza_w: 2100, tensione_v: 230.1, corrente_a: 9.13 },
  shelly1pm: { id: 'shelly1pm', nome: 'Shelly 1PM', ip: '192.168.1.21', modello: 'SHSW-PM', generazione: 1, tipo: 'PM_RELAY', acceso: true, potenza_w: null, tensione_v: null, corrente_a: null }
};

vi.mock('../hooks/useApi', () => ({
  useShellyDevices: () => ({
    data: devices,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch
  }),
  queryKeys: {
    shellyStato: (id: string) => ['shelly-stato', id]
  }
}));

vi.mock('@tanstack/react-query', () => ({
  useQueries: ({ queries }: { queries: { queryKey: string[] }[] }) =>
    queries.map((query) => {
      const id = query.queryKey[1];
      return { data: statoPerId[id], isError: false, dataUpdatedAt: 1726840800000, refetch };
    })
}));

beforeEach(() => {
  statoPerId.shelly1pm = { ...statoPerId.shelly1pm, potenza_w: null, tensione_v: null, corrente_a: null };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ShellyMonitorPage />
    </MemoryRouter>
  );
}

describe('ShellyMonitorPage', () => {
  it('mostra il totale istantaneo (somma delle ultime letture) in evidenza', () => {
    renderPage();
    expect(screen.getByText('Totale consumo istantaneo')).toBeInTheDocument();
    expect(screen.getByText('2145.2')).toBeInTheDocument();
    expect(screen.getByText('watt totali')).toBeInTheDocument();
    expect(screen.getByText('≥ 2000 W')).toBeInTheDocument();
  });

  it('mostra il dettaglio con le ultime misure dei dispositivi con power meter', () => {
    renderPage();
    expect(screen.getByText('Dettaglio per dispositivo')).toBeInTheDocument();
    expect(screen.getByText('45.2 W')).toBeInTheDocument();
    expect(screen.getByText('2100.0 W')).toBeInTheDocument();
    expect(screen.getByText('3 con misure')).toBeInTheDocument();
    expect(screen.getByLabelText('Intervallo di aggiornamento in secondi')).toHaveValue(5);
  });

  it('include i PM_RELAY nel monitor ed esclude i relay senza power meter', () => {
    renderPage();
    expect(screen.getByText('Shelly 1PM')).toBeInTheDocument();
    expect(screen.queryByText('Portone')).not.toBeInTheDocument();
  });

  it('esclude dal totale le misure null invece di contarle come 0', () => {
    renderPage();
    expect(screen.getByText('2145.2')).toBeInTheDocument();
    const rigaPmRelay = screen.getByText('Shelly 1PM').closest('div');
    expect(rigaPmRelay?.textContent).toContain('— · —');
  });

  it('valida l intervallo: errore per valori non validi, applica quelli validi', () => {
    renderPage();

    const input = screen.getByLabelText('Intervallo di aggiornamento in secondi') as HTMLInputElement;
    const form = input.closest('form') as HTMLFormElement;
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.submit(form);
    expect(screen.getByText('Il valore deve essere un numero intero di almeno 1 secondo.')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.submit(form);
    expect(screen.queryByText('Il valore deve essere un numero intero di almeno 1 secondo.')).not.toBeInTheDocument();
    expect(screen.getByText('10 s · aggiorna')).toBeInTheDocument();
    expect(input).toHaveValue(10);
  });
});

describe('ShellyMonitorPage — orientamento del grafico', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mostra le barre orizzontali su tablet 7 pollici in orizzontale', () => {
    mockMatchMedia(true);
    renderPage();
    expect(document.querySelector('[data-chart-layout="horizontal"]')).not.toBeNull();
    expect(screen.getByText('2145.2')).toBeInTheDocument();
    expect(screen.getByText('2100.0 W')).toBeInTheDocument();
  });

  it('mantiene le barre verticali sugli smartphone', () => {
    mockMatchMedia(false);
    renderPage();
    expect(document.querySelector('[data-chart-layout="vertical"]')).not.toBeNull();
    expect(document.querySelector('[data-chart-layout="horizontal"]')).toBeNull();
  });
});
