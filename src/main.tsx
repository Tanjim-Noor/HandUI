import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';
import { HandUISessionProvider } from './app/HandUISessionProvider';
import { errorLogger } from './handui/runtime/errorLogger';
import './ui/styles.css';

errorLogger.installGlobalHandlers();

const root = document.getElementById('root');
if (!root) {
  errorLogger.capture('missing_root', new Error('Missing #root mount point'), {
    severity: 'fatal',
  });
  throw new Error('Missing #root mount point');
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <HandUISessionProvider>
          <App />
        </HandUISessionProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
