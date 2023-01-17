import { Route, Router, Switch }    from 'react-router-dom';
import { createBrowserHistory }     from 'history';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect }                from 'react';

import { Account }        from './account';
import { Home }           from './home';
import { Login }          from './login';
import { NotFound }       from './not-found';
import { Profile }        from './profile';
import { Register }       from './register';
import { Tracker }        from './tracker';
import { logPageView }    from '../utils/analytics';
import { retrieveUser }   from '../actions/user';
import { setSessionUser } from '../actions/session';

const history = createBrowserHistory();
history.listen(() => logPageView());
logPageView();

export function App () {
  const dispatch = useDispatch();

  const nightMode = useSelector(({ nightMode }) => nightMode);
  const session = useSelector(({ session }) => session);

  useEffect(() => {
    (async () => {
      if (session) {
        const user = await dispatch(retrieveUser(session.username));
        dispatch(setSessionUser(user));
      }
    })();
  }, [session]);

  return (
    <Router history={history}>
      <div className={`root ${nightMode ? 'night-mode' : ''}`}>
        <Switch>
          <Route component={Home} exact path="/" />
          <Route component={Login} exact path="/login" />
          <Route component={Register} exact path="/register" />
          <Route component={Account} exact path="/account" />
          <Route component={Profile} exact path="/u/me" />
          <Route component={Profile} exact path="/u/:username" />
          <Route component={Tracker} exact path="/u/:username/:slug" />
          <Route component={NotFound} path="/" />
        </Switch>
      </div>
    </Router>
  );
}
