import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../src/app/App';
import { HandUISessionProvider } from '../src/app/HandUISessionProvider';

afterEach(cleanup);

function renderRoute(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <HandUISessionProvider>
        <App />
      </HandUISessionProvider>
    </MemoryRouter>,
  );
}

describe('app shell', () => {
  it('explains the product and links into the gallery', () => {
    renderRoute('/');
    expect(screen.getByRole('heading', { name: /control the interface/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /enter the lab/i })).toHaveAttribute(
      'href',
      '/gallery/landmarks',
    );
  });

  it('shows privacy commitments', () => {
    renderRoute('/privacy');
    expect(screen.getByRole('heading', { name: /your camera is an input/i })).toBeInTheDocument();
    expect(screen.getByText(/no telemetry/i)).toBeInTheDocument();
  });

  it('offers camera and replay controls in the gallery', () => {
    renderRoute('/gallery/landmarks');
    expect(screen.getByRole('button', { name: /start camera/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try replay/i })).toBeInTheDocument();
  });

  it('keeps the shared session alive through Strict Mode effect replay', async () => {
    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/gallery/landmarks']}>
          <HandUISessionProvider>
            <App />
          </HandUISessionProvider>
        </MemoryRouter>
      </StrictMode>,
    );
    screen.getByRole('button', { name: /try replay/i }).click();
    await waitFor(() => expect(screen.getByText('2 hands · synthetic')).toBeInTheDocument());
  });
});
