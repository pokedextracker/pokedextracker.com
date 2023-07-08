import { Rollbar } from './rollbar';

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
