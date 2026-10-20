import { historyContext } from "@rollbar/react";
import { createBrowserHistory } from "history";
import { Route, Router, Switch } from "react-router-dom";

import { useLocalStorageContext } from "../../hooks/contexts/use-local-storage-context";
import { Rollbar } from "../../utils/rollbar";
import { Account } from "./Account";
import { Home } from "./Home";
import { Login } from "./Login";
import { NotFound } from "./NotFound";
import { Profile } from "./Profile";
import { ProfileRedirect } from "./ProfileRedirect";
import { Register } from "./Register";
import { Tracker } from "./Tracker";

const history = createBrowserHistory();
history.listen(historyContext(Rollbar));

export function App() {
  const { isNightMode } = useLocalStorageContext();

  return (
    <Router history={history}>
      <div className={`root ${isNightMode ? "night-mode" : ""}`}>
        <Switch>
          <Route component={Home} exact path="/" />
          <Route component={Login} exact path="/login" />
          <Route component={Register} exact path="/register" />
          <Route component={Account} exact path="/account" />
          <Route component={ProfileRedirect} exact path="/profile" />
          <Route component={Profile} exact path="/u/:username" />
          <Route component={Tracker} exact path="/u/:username/:slug" />
          <Route component={NotFound} path="/" />
        </Switch>
      </div>
    </Router>
  );
}
