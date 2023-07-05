import './styles';

import Modal from 'react-modal';
import { ErrorBoundary, Provider as RollbarProvider } from '@rollbar/react';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from 'react-dom';

import { App } from './components/pages/App';
import { NightModeProvider } from './hooks/contexts/use-night-mode';
import { Rollbar } from './utils/rollbar';
import { SessionProvider } from './hooks/contexts/use-session';
import { Store } from './stores';
import { queryClient } from './utils/query-client';

Modal.setAppElement('#root');

function run () {
  render(
    <RollbarProvider instance={Rollbar}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <NightModeProvider>
              <Provider store={Store}>
                <App />
              </Provider>
            </NightModeProvider>
          </SessionProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </RollbarProvider>,
    document.getElementById('root')
  );
}

if (document.getElementById('root')) {
  run();
} else {
  window.addEventListener('DOMContentLoaded', run);
}
