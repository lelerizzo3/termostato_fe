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
  statoPerId.forno = { ...statoPerId.forno, potenza_w: 2100 };
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
    expect(screen.getByText('watt')).toBeInTheDocument();
    expect(screen.getByText('somma delle ultime misure di 2 dispositivi con power meter · 5 s · aggiorna')).toBeInTheDocument();
  });

  it('mostra la barra del totale sulla scala 0-3000 W con i valori di soglia', () => {
    renderPage();
    expect(screen.getByLabelText('Totale 2145.2 watt, 72% della scala 0-3000 watt')).toBeInTheDocument();
    expect(screen.getByLabelText('Totale al 72% della scala 0-3000 watt')).toBeInTheDocument();
    expect(screen.getByText('100 W')).toBeInTheDocument();
    expect(screen.getByText('3000 W')).toBeInTheDocument();
    expect(screen.getByText('≥ 3000 W')).toBeInTheDocument();
    expect(screen.getByText('verso arancione')).toBeInTheDocument();
  });

  it('segnala la saturazione della scala quando il totale supera 3000 W', () => {
    statoPerId.forno = { ...statoPerId.forno, potenza_w: 3500 };
    renderPage();
    expect(screen.getByText('▲ 3545.2 W · 118% della scala (barra saturata)')).toBeInTheDocument();
  });

  it('mostra una riga per dispositivo con barra colorata, watt e quota sul totale', () => {
    const { container } = renderPage();
    expect(screen.getByText('Dispositivi')).toBeInTheDocument();
    expect(screen.getByText('45.2 W')).toBeInTheDocument();
    expect(screen.getByText('2100.0 W')).toBeInTheDocument();
    expect(screen.getByText('3 con misure')).toBeInTheDocument();

    expect(container.querySelector<HTMLElement>('[data-bar-fill="frigo"]')?.style.width).toBe('1.5%');
    expect(container.querySelector<HTMLElement>('[data-bar-fill="forno"]')?.style.width).toBe('70%');
    expect(container.querySelector<HTMLElement>('[data-bar-fill="shelly1pm"]')?.style.width).toBe('0%');

    const rigaForno = container.querySelector<HTMLElement>('[data-monitor-row="forno"]');
    expect(rigaForno?.textContent).toContain('230.1 V · 9.13 A');
    expect(rigaForno?.textContent).toContain('98% del totale');
    expect(screen.getByLabelText('Intervallo di aggiornamento in secondi')).toHaveValue(5);
  });

  it('include i PM_RELAY nel monitor ed esclude i relay senza power meter', () => {
    renderPage();
    expect(screen.getByText('Shelly 1PM')).toBeInTheDocument();
    expect(screen.queryByText('Portone')).not.toBeInTheDocument();
  });

  it('esclude dal totale le misure null invece di contarle come 0', () => {
    const { container } = renderPage();
    expect(screen.getByText('2145.2')).toBeInTheDocument();
    const rigaPmRelay = container.querySelector<HTMLElement>('[data-monitor-row="shelly1pm"]');
    expect(rigaPmRelay?.textContent).toContain('misura non disponibile');
    expect(rigaPmRelay?.textContent).toContain('—');
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
    expect(screen.getByText('somma delle ultime misure di 2 dispositivi con power meter · 10 s · aggiorna')).toBeInTheDocument();
    expect(input).toHaveValue(10);
  });
});

describe('ShellyMonitorPage — orientamento del grafico', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mostra le righe con barre in orizzontale su tablet 7 pollici in orizzontale', () => {
    mockMatchMedia(true);
    renderPage();
    expect(document.querySelector('[data-chart-layout="horizontal"]')).not.toBeNull();
    expect(screen.getByText('2145.2')).toBeInTheDocument();
    expect(screen.getByText('2100.0 W')).toBeInTheDocument();
    expect(screen.getByText('Come si legge')).toBeInTheDocument();
  });

  it('mantiene il layout a colonna singola sugli smartphone', () => {
    mockMatchMedia(false);
    renderPage();
    expect(document.querySelector('[data-chart-layout="vertical"]')).not.toBeNull();
    expect(document.querySelector('[data-chart-layout="horizontal"]')).toBeNull();
    expect(screen.getByText('Come si legge').closest('section')?.className).toContain('land:hidden');
  });
});
