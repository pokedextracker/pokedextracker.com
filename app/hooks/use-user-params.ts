import { useParams } from "react-router";

// useUserParams returns the username and slug from the /u/:username and
// /u/:username/:slug routes. The components that call it only render under
// those routes, so the username is always there. The slug is "" on a
// profile, where nothing that calls this uses it.
export function useUserParams(): { username: string; slug: string } {
  const { username = "", slug = "" } = useParams<"username" | "slug">();
  return { username, slug };
}
