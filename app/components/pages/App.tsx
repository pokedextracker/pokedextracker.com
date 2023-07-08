import { Route, Router, Switch } from 'react-router-dom';
import { createBrowserHistory } from 'history';
import { historyContext } from '@rollbar/react';

import { Account } from './Account';
import { Home } from './Home';
import { Login } from './Login';
import { NotFound } from './NotFound';
import { Profile } from './Profile';
import { Register } from './Register';
import { Rollbar } from '../../utils/rollbar';
import { Tracker } from './Tracker';
import { logPageView } from '../../utils/analytics';
import { useLocalStorageContext } from '../../hooks/contexts/use-local-storage-context';

const history = createBrowserHistory();
history.listen(() => logPageView());
// @ts-ignore Rollbar's types are wrong. See https://github.com/rollbar/rollbar-react/issues/69
history.listen(historyContext(Rollbar));
logPageView();

export function App () {
  const { isNightMode } = useLocalStorageContext();

  return (
    <Router history={history}>
      <div className={`root ${isNightMode ? 'night-mode' : ''}`}>
        <Switch>
          <Route component={Home} exact path="/" />
          <Route component={Login} exact path="/login" />
          <Route component={Register} exact path="/register" />
          <Route component={Account} exact path="/account" />
          <Route component={Profile} exact path="/u/:username" />
          <Route component={Tracker} exact path="/u/:username/:slug" />
          <Route component={NotFound} path="/" />
        </Switch>
      </div>
    </Router>
  );
}
