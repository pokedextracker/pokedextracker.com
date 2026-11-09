// TOKEN_KEY is where the login token is kept in localStorage. In development,
// each worktree's dev server, and the one using the staging API, adds its own
// namespace: they can all end up on the same localhost port, and localStorage
// is shared per host and port. Production builds don't set one. The analytics
// hook in pkg/server/analytics.go falls back to production's key until the
// app has loaded and shared the tab's token.
export const TOKEN_KEY = __TOKEN_NAMESPACE__
  ? `token_${__TOKEN_NAMESPACE__}`
  : "token";
