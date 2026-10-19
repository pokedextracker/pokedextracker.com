// slugOf makes a dex's slug from its title, the way the frontend does. The
// API takes the slug as given, so tests that make dexes through it need this.
export function slugOf(title: string): string {
  return title.toLowerCase().replace(/ /g, "-");
}
