import { Rollbar } from './rollbar';
import { localStorage } from './local-storage';

import type { Session } from '../types';

export function tokenToUser (token: string | null): Session | null {
  if (!token) {
    Rollbar.configure({
      payload: { user: null },
    });
    return null;
  }

  const user = JSON.parse(atob(token.split('.')[1])) as Session;
  user.token = token;

  Rollbar.configure({
    payload: { user: { id: user.id, username: user.username } },
  });

  return user;
}

export function loadState () {
  const showInfo = localStorage.getItem('showInfo') === 'true' || undefined;

  return { showInfo };
}

// We'll be removing redux and the concept of state soon, so this is just a stopgap.
interface State {
  showInfo: string;
}

export function saveState ({ showInfo }: State) {
  localStorage.setItem('showInfo', showInfo);
}
