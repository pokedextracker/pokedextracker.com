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

  Rollbar.configure({
    payload: { user: { id: user.id, username: user.username } },
  });

  return user;
}

export function loadState () {
  const notif20230608 = localStorage.getItem('notif-2023.06.08') === 'true' || undefined;
  const token = localStorage.getItem('token');
  const session = tokenToUser(token);
  const showInfo = localStorage.getItem('showInfo') === 'true' || undefined;

  return { notification: notif20230608, session, showInfo, token };
}

// We'll be removing redux and the concept of state soon, so this is just a stopgap.
interface State {
  notification: string;
  showInfo: string;
  token: string;
}

export function saveState ({ notification, showInfo, token }: State) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }

  localStorage.setItem('notif-2023.06.08', notification);
  localStorage.setItem('showInfo', showInfo);
}
