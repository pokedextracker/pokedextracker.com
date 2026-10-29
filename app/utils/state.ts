import type { Session } from "../types";
import { Rollbar } from "./rollbar";

// tokenToUser reads the session out of a login token, or returns null when
// there's no token or it doesn't hold one, like a corrupted one in storage.
export function tokenToUser(token: string | null): Session | null {
  const user = token ? decodeToken(token) : null;

  Rollbar.configure({
    payload: { user: user && { id: user.id, username: user.username } },
  });

  if (!user || !token) {
    return null;
  }

  user.token = token;
  return user;
}

function decodeToken(token: string): Session | null {
  try {
    // The payload is in base64url, which atob doesn't read without first
    // swapping its two URL-safe characters back.
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const user = JSON.parse(atob(payload)) as Session | null;
    if (typeof user?.id !== "number" || typeof user.username !== "string") {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}
