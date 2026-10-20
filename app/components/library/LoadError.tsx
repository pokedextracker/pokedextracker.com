interface Props {
  // What couldn't be loaded, like "dex" or "profile".
  thing: string;
}

// LoadError stands in for a page whose data failed to load for a reason other
// than it not existing, like the server being down. Something that doesn't
// exist gets the not found page instead.
export function LoadError({ thing }: Props) {
  return (
    <div className="loading">
      Couldn&apos;t load this {thing}. Try refreshing the page.
    </div>
  );
}

// isNotFound reports whether a failed request was a 404.
export function isNotFound(error: { response?: Response } | null): boolean {
  return error?.response?.status === 404;
}
