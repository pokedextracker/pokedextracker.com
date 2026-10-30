import type { Session } from "../types";
import { Rollbar } from "./rollbar";

// tokenToUser reads the session out of a login token, or returns null when
// there's no token or it doesn't hold one, like a corrupted one in storage.
export function tokenToUser(token: string | null): Session | null {
  const user = token ? decodeToken(token) : null;

  Rollbar.configure({
    payload: { user: user && { id: user.id, username: user.username } },
  });

  return user;
}

// sessionFromToken reads a token the API just sent, which always holds a
// session, so one that doesn't is an error rather than a signed out user.
export function sessionFromToken(token: string): Session {
  const session = tokenToUser(token);
  if (!session) {
    throw new Error("We couldn't read the login the server sent back.");
  }
  return session;
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
    return { ...user, token };
  } catch {
    return null;
  }
}
