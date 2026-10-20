import keyBy from "lodash/keyBy";
import { useEffect, useMemo, useRef, useState } from "react";

import { useCaptures } from "../../../hooks/queries/captures";
import { useUser } from "../../../hooks/queries/users";
import { useDexParams } from "../../../hooks/use-dex-params";
import type { Capture } from "../../../types";
import { Footer } from "../../library/Footer";
import { Nav } from "../../library/Nav";
import { Reload } from "../../library/Reload";
import { NotFound } from "../NotFound";
import { Dex } from "./Dex";
import { Info } from "./Info";
import { SHOW_SCROLL_THRESHOLD } from "./Scroll";
import { SearchBar } from "./SearchBar";
import { TrackerContextProvider } from "./use-tracker";

// Tracker loads the dex's owner and captures, then renders the tracker with
// them. A dex that doesn't exist has no captures either (the API 404s), so it
// gets the not-found page. The tracker is keyed by the dex, so moving to
// another one starts it fresh, like loading that page directly.
export function Tracker() {
  const { username, slug } = useDexParams();

  const { data: user, isPending: userIsLoading } = useUser(username);
  const { data: captures, isPending: capturesIsLoading } = useCaptures(
    username,
    slug,
  );

  const dex = useMemo(() => keyBy(user?.dexes, "slug")[slug], [user, slug]);

  useEffect(() => {
    document.title = `${username}'s Living Dex | Pokédex Tracker`;
  }, [username]);

  if (userIsLoading || capturesIsLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!dex || !captures?.length) {
    return <NotFound />;
  }

  return (
    <TrackerContextProvider
      initialCaptures={captures}
      key={`${username}/${slug}`}
    >
      <TrackerInner captures={captures} />
    </TrackerContextProvider>
  );
}

interface TrackerInnerProps {
  captures: Capture[];
}

function TrackerInner({ captures }: TrackerInnerProps) {
  const trackerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [hideCaught, setHideCaught] = useState(false);
  const [showScroll, setShowScroll] = useState(false);
  const [selectedPokemon, setSelectedPokemon] = useState(
    captures[0].pokemon.id,
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
    <div className="tracker-container">
      <Nav />
      <Reload />
      <div className="tracker">
        <div className="dex-wrapper">
          <SearchBar
            hideCaught={hideCaught}
            query={query}
            setHideCaught={setHideCaught}
            setQuery={setQuery}
          />
          <div className="dex-column" onScroll={handleScroll} ref={trackerRef}>
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
