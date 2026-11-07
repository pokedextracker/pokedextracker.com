// The frontend makes a dex's slug from its title, and the API takes the slug
// as given, so tests that make dexes through the API use the same function.
export { slug as slugOf } from "../app/utils/slug";
