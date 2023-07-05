import keyBy from 'lodash/keyBy';
import throttle from 'lodash/throttle';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router';

import { Dex } from './Dex';
import { Footer } from '../../library/Footer';
import { Info } from './Info';
import { Nav } from '../../library/Nav';
import { NotFound } from '../NotFound';
import { Reload } from '../../library/Reload';
import { SCROLL_DEBOUNCE, SHOW_SCROLL_THRESHOLD } from './Scroll';
import { SearchBar } from './SearchBar';
import { setCurrentPokemon } from '../../../actions/pokemon';
import { useCaptures } from '../../../hooks/queries/captures';
import { useUser } from '../../../hooks/queries/users';

export function Tracker () {
  const dispatch = useDispatch();

  const { username, slug } = useParams();

  const trackerRef = useRef(null);

  const { data: user, isLoading: userIsLoading } = useUser(username);
  const { data: captures, isLoading: capturesIsLoading } = useCaptures(username, slug);

  const dex = useMemo(() => keyBy(user?.dexes, 'slug')[slug], [user, slug]);

  const [query, setQuery] = useState('');
  const [hideCaught, setHideCaught] = useState(false);
  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => {
    document.title = `${username}'s Living Dex | Pokédex Tracker`;
  }, []);

  useEffect(() => {
    if (trackerRef.current) {
      trackerRef.current.scrollTop = 0;
    }
  }, [query]);

  useEffect(() => {
    if (captures) {
      dispatch(setCurrentPokemon(captures[0].pokemon.id));
    }
  }, [captures]);

  const handleScroll = throttle(() => {
    if (!showScroll && trackerRef.current && trackerRef.current.scrollTop >= SHOW_SCROLL_THRESHOLD) {
      setShowScroll(true);
    } else if (showScroll && trackerRef.current && trackerRef.current.scrollTop < SHOW_SCROLL_THRESHOLD) {
      setShowScroll(false);
    }
  }, SCROLL_DEBOUNCE);

  const handleScrollButtonClick = useCallback(() => {
    if (trackerRef.current) {
      trackerRef.current.scrollTop = 0;
    }
  }, [trackerRef.current]);

  if (userIsLoading || capturesIsLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!dex) {
    return <NotFound />;
  }

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
              showScrollButton={showScroll}
            />
            <Footer />
          </div>
        </div>
        <Info />
      </div>
    </div>
  );
}
