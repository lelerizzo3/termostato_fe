import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockMatchMedia } from '../../test/matchMedia';
import { AppLayout } from './AppLayout';

vi.mock('../../hooks/useApi', () => ({
  useHealth: () => ({ isSuccess: true })
}));

function renderLayout(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppLayout>
        <p>contenuto</p>
      </AppLayout>
    </MemoryRouter>
  );
}

describe('AppLayout — tab dell area dispositivi', () => {
  it('rinomina il tab Shelly in Dispositivi', () => {
    renderLayout('/shelly');
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual(['🏠 Termostato', '💡 Dispositivi']);
  });

  it('apre Monitor di default quando si seleziona il tab Dispositivi', () => {
    renderLayout('/stato');
    fireEvent.click(screen.getByRole('tab', { name: '💡 Dispositivi' }));
    const nav = screen.getByRole('navigation', { name: 'Navigazione principale' });
    const attiva = nav.querySelector('a[aria-current="page"]');
    expect(attiva?.getAttribute('href')).toBe('/shelly/monitor');
  });
});

describe('AppLayout — bottom navigation', () => {
  it('mostra le due sole pagine dell area dispositivi con Monitor per prima', () => {
    renderLayout('/shelly');
    const nav = screen.getByRole('navigation', { name: 'Navigazione principale' });
    const links = Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/shelly/monitor', '/shelly']);
    expect(nav.textContent).not.toContain('Consumi');
  });

  it('parte dalla pagina dispositivi all indirizzo /shelly', () => {
    renderLayout('/shelly');
    const nav = screen.getByRole('navigation', { name: 'Navigazione principale' });
    const attiva = nav.querySelector('a[aria-current="page"]');
    expect(attiva?.getAttribute('href')).toBe('/shelly');
  });

  it('cambia alla pagina monitor su /shelly/monitor', () => {
    renderLayout('/shelly/monitor');
    const nav = screen.getByRole('navigation', { name: 'Navigazione principale' });
    const attiva = nav.querySelector('a[aria-current="page"]');
    expect(attiva?.getAttribute('href')).toBe('/shelly/monitor');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Monitor consumi');
  });

  it('mantiene la bottom navigation del termostato sulle pagine termostato', () => {
    renderLayout('/log');
    const nav = screen.getByRole('navigation', { name: 'Navigazione principale' });
    expect(nav.textContent).toContain('Calendario');
    expect(nav.textContent).not.toContain('Monitor');
  });
});

describe('AppLayout — tablet 7 pollici in orizzontale', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sostituisce la bottom navigation con il rail laterale', () => {
    mockMatchMedia(true);
    renderLayout('/shelly/monitor');
    const rail = screen.getByRole('complementary', { name: 'Navigazione laterale' });
    expect(rail.textContent).toContain('Dispositivi');
    expect(rail.textContent).toContain('Monitor');
    expect(screen.getByRole('link', { name: /Monitor/ })).toHaveAttribute('href', '/shelly/monitor');
    expect(screen.queryByRole('navigation', { name: 'Navigazione principale' })).not.toBeInTheDocument();
  });

  it('mantiene i tab di area e il titolo nello schermo orizzontale', () => {
    mockMatchMedia(true);
    renderLayout('/shelly/monitor');
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent?.trim())).toEqual(['🏠 Termostato', '💡 Dispositivi']);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Monitor consumi');
  });

  it('non applica il rail laterale sugli smartphone', () => {
    mockMatchMedia(false);
    renderLayout('/shelly/monitor');
    expect(screen.getByRole('navigation', { name: 'Navigazione principale' })).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Navigazione laterale' })).not.toBeInTheDocument();
  });
});
