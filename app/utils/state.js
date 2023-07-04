import { Rollbar } from './rollbar';
import { localStorage } from './local-storage';

export function tokenToUser (token) {
  if (!token) {
    Rollbar.configure({
      payload: { user: null },
    });
    return null;
  }

  const user = JSON.parse(atob(token.split('.')[1]));

  Rollbar.configure({
    payload: { user: { id: user.id, username: user.username } },
  });

  return user;
}

export function loadState () {
  const nightMode = localStorage.getItem('nightMode') === 'true' || undefined;
  const notif20230608 = localStorage.getItem('notif-2023.06.08') === 'true' || undefined;
  const token = localStorage.getItem('token');
  const session = tokenToUser(token);
  const showInfo = localStorage.getItem('showInfo') === 'true' || undefined;

  return { nightMode, notification: notif20230608, session, showInfo, token };
}

export function saveState ({ nightMode, notification, showInfo, token }) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }

  localStorage.setItem('notif-2023.06.08', notification);
  localStorage.setItem('showInfo', showInfo);
  localStorage.setItem('nightMode', nightMode);
}
