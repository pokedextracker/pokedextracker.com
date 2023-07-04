import './styles';

import Modal from 'react-modal';
import { ErrorBoundary, Provider as RollbarProvider } from '@rollbar/react';
import { Provider } from 'react-redux';
import { render } from 'react-dom';

import { App } from './components/app';
import { Rollbar } from './utils/rollbar';
import { Store } from './stores';

Modal.setAppElement('#root');

function run () {
  render(
    <RollbarProvider instance={Rollbar}>
      <ErrorBoundary>
        <Provider store={Store}>
          <App />
        </Provider>
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
