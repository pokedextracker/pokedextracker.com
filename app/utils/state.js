import { Sentry }       from '../utils/sentry';
import { localStorage } from '../utils/local-storage';

export function tokenToUser (token) {
  if (!token) {
    Sentry.setUser(null);
    return null;
  }

  const user = JSON.parse(atob(token.split('.')[1]));

  Sentry.setUser({ id: user.id, username: user.username });

  return user;
}

export function loadState () {
  const nightMode = localStorage.getItem('nightMode') === 'true' || undefined;
  const notif20200715 = localStorage.getItem('notif-2020.07.15') === 'true' || undefined;
  const token = localStorage.getItem('token');
  const session = tokenToUser(token);
  const showInfo = localStorage.getItem('showInfo') === 'true' || undefined;

  return { nightMode, notification: notif20200715, session, showInfo, token };
}

export function saveState ({ nightMode, notification, showInfo, token }) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }

  localStorage.setItem('notif-2020.07.15', notification);
  localStorage.setItem('showInfo', showInfo);
  localStorage.setItem('nightMode', nightMode);
}
