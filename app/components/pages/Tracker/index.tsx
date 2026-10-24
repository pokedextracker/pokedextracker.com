import keyBy from "lodash/keyBy";
import { useEffect, useMemo, useRef, useState } from "react";

import { useCaptures } from "../../../hooks/queries/captures";
import { useUser } from "../../../hooks/queries/users";
import { useUserParams } from "../../../hooks/use-user-params";
import { isNotFound } from "../../../utils/api";
import { Footer } from "../../library/Footer";
import { pageContainer } from "../../library/layout";
import { LoadError } from "../../library/LoadError";
import { Loading } from "../../library/Loading";
import { Nav } from "../../library/Nav";
import { Reload } from "../../library/Reload";
import { NotFound } from "../NotFound";
import { Dex } from "./Dex";
import { Info } from "./Info";
import { SHOW_SCROLL_THRESHOLD } from "./Scroll";
import { SearchBar } from "./SearchBar";
import { TrackerContextProvider } from "./use-tracker";

// Tracker is keyed by the dex, so moving to another one (from the nav, or with
// Back) mounts it fresh, like loading that page directly: its captures are
// fetched again and its search and selection start over. The router would
// otherwise keep the same component mounted with new params.
export function Tracker() {
  const { username, slug } = useUserParams();

  return <TrackerPage key={`${username}/${slug}`} />;
}

// TrackerPage loads the dex's owner and captures, then renders the tracker
// with them. A dex that doesn't exist has no captures either (the API 404s),
// so it gets the not-found page.
function TrackerPage() {
  const { username, slug } = useUserParams();

  const userQuery = useUser(username);
  const capturesQuery = useCaptures(username, slug);
  const user = userQuery.data;
  // After a failed fetch, the cache can still hold older captures. They're not
  // used: the tracker only starts from this visit's.
  const captures = capturesQuery.error ? undefined : capturesQuery.data;

  const dex = useMemo(() => keyBy(user?.dexes, "slug")[slug], [user, slug]);

  // The tracker keeps its own copy of the captures as Pokémon are marked, and
  // the cached ones can be from before that (or from before the dex's game
  // changed), so it waits for this visit's fetch rather than starting from
  // the cache.
  if (userQuery.isPending || !capturesQuery.isFetchedAfterMount) {
    return <Loading>Loading...</Loading>;
  }

  // A failed refresh of an owner who's already loaded doesn't count: the page
  // can still show them.
  const failed = [
    userQuery.data ? null : userQuery.error,
    capturesQuery.error,
  ].find((error) => error && !isNotFound(error));
  if (failed) {
    return <LoadError error={failed} thing="dex" />;
  }

  if (!dex || !captures?.length) {
    return <NotFound />;
  }

  return (
    <TrackerContextProvider initialCaptures={captures}>
      <TrackerInner initialSelectedPokemon={captures[0].pokemon.id} />
    </TrackerContextProvider>
  );
}

interface TrackerInnerProps {
  initialSelectedPokemon: number;
}

function TrackerInner({ initialSelectedPokemon }: TrackerInnerProps) {
  const { username } = useUserParams();

  const trackerRef = useRef<HTMLDivElement>(null);

  // Set here rather than while loading, so a dex that turns out not to exist
  // keeps the not found page's title.
  useEffect(() => {
    document.title = `${username}'s Living Dex | Pokédex Tracker`;
  }, [username]);

  const [query, setQuery] = useState("");
  const [hideCaught, setHideCaught] = useState(false);
  const [showScroll, setShowScroll] = useState(false);
  const [selectedPokemon, setSelectedPokemon] = useState(
    initialSelectedPokemon,
  );

  useEffect(() => {
    if (trackerRef.current) {
      trackerRef.current.scrollTop = 0;
    }
  }, [query]);

  // Setting the same value doesn't re-render, so this can run on every
  // scroll.
  const handleScroll = () => {
    if (trackerRef.current) {
      setShowScroll(trackerRef.current.scrollTop >= SHOW_SCROLL_THRESHOLD);
    }
  };

  const handleScrollButtonClick = () => {
    if (trackerRef.current) {
      trackerRef.current.scrollTop = 0;
    }
  };

  return (
    <div className={pageContainer}>
      <Nav />
      <Reload />
      <div className="relative flex min-h-0 flex-[1_1_auto] print:block">
        <div className="flex grow flex-col print:block">
          <SearchBar
            hideCaught={hideCaught}
            query={query}
            setHideCaught={setHideCaught}
            setQuery={setQuery}
          />
          {/* Printed whole, keeping the backgrounds that show the sprites
              and what's caught, which printing otherwise drops. */}
          <div
            className="flex grow flex-col overflow-y-scroll print:block print:overflow-visible print:[print-color-adjust:exact]"
            onScroll={handleScroll}
            ref={trackerRef}
          >
            <Dex
              hideCaught={hideCaught}
              onScrollButtonClick={handleScrollButtonClick}
              query={query}
              setHideCaught={setHideCaught}
              setQuery={setQuery}
              setSelectedPokemon={setSelectedPokemon}
              showScrollButton={showScroll}
            />
            <Footer />
          </div>
        </div>
        <Info
          selectedPokemon={selectedPokemon}
          setSelectedPokemon={setSelectedPokemon}
        />
      </div>
    </div>
  );
}
