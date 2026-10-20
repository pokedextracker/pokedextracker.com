import { useParams } from "react-router";

// useDexParams returns the username and slug from the /u/:username and
// /u/:username/:slug routes. The components that call it only render under
// those routes, so the username is always there, and the slug is on every
// page that reads it.
export function useDexParams(): { username: string; slug: string } {
  const { username = "", slug = "" } = useParams<"username" | "slug">();
  return { username, slug };
}
