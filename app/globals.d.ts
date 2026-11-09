// Set by vite.config.mts from POKEDEXTRACKER_TOKEN_NAMESPACE (see
// app/utils/token.ts).
declare const __TOKEN_NAMESPACE__: string;

interface Window {
  // The tab's login token, for the analytics hook (see app/utils/api.ts).
  pokedexTrackerToken?: string | null;
}
