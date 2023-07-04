import ReactGA from 'react-ga';

import { Config } from '../../config';

ReactGA.initialize(Config.GA_ID, { titleCase: false });

export { ReactGA };

export function logPageView () {
  ReactGA.set({ page: window.location.pathname });
  ReactGA.pageview(window.location.pathname);
}
