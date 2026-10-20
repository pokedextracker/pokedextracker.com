import { Navigate } from "react-router";

import { useSession } from "../../hooks/contexts/use-session";

export function ProfileRedirect() {
  const { session } = useSession();

  if (session) {
    // If we have a session, redirect to the logged-in user's profile page.
    return <Navigate replace to={`/u/${session.username}`} />;
  }

  // The user is not logged in yet, so we redirect them to the login page.
  return <Navigate replace to="/login" />;
}
