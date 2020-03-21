import throttle                                     from 'lodash/throttle';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector }                 from 'react-redux';
import { useParams }                                from 'react-router';

import { Dex }                                    from './dex';
import { Footer }                                 from './footer';
import { Info }                                   from './info';
import { Nav }                                    from './nav';
import { NotFound }                               from './not-found';
import { Reload }                                 from './reload';
import { SCROLL_DEBOUNCE, SHOW_SCROLL_THRESHOLD } from './scroll';
import { SearchBar }                              from './search-bar';
import { checkVersion }                           from '../actions/utils';
import { clearPokemon, setCurrentPokemon }        from '../actions/pokemon';
import { listCaptures }                           from '../actions/capture';
import { retrieveDex, setCurrentDex }             from '../actions/dex';
import { retrieveUser, setUser }                  from '../actions/user';
import { setShowScroll, setShowShare }            from '../actions/tracker';

export function Tracker () {
  const dispatch = useDispatch();

  const { slug, username } = useParams();

  const trackerRef = useRef(null);

  const dex = useSelector(({ currentDex, currentUser, users }) => users[currentUser] && users[currentUser].dexesBySlug[currentDex]);
  const showScroll = useSelector(({ showScroll }) => showScroll);

  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [hideCaught, setHideCaught] = useState(false);

  useEffect(() => {
    document.title = `${username}'s Living Dex | Pokédex Tracker`;
  }, []);

  useEffect(() => {
    if (trackerRef.current) {
      trackerRef.current.scrollTop = 0;
    }
  }, [query]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);

      dispatch(checkVersion());
      dispatch(clearPokemon());
      dispatch(setShowScroll(false));
      dispatch(setShowShare(false));
      dispatch(setCurrentDex(slug, username));

      try {
        const u = await dispatch(retrieveUser(username));
        dispatch(setUser(u));
        const d = await dispatch(retrieveDex(slug, username));
        const captures = await dispatch(listCaptures(d, username));
        dispatch(setCurrentPokemon(captures[0].pokemon.id));

        setIsLoading(false);
      } catch (err) {
        setIsLoading(false);
      }
    })();
  }, [slug, username]);

  const handleScroll = throttle(() => {
    if (!showScroll && trackerRef.current && trackerRef.current.scrollTop >= SHOW_SCROLL_THRESHOLD) {
      dispatch(setShowScroll(true));
    } else if (showScroll && trackerRef.current && trackerRef.current.scrollTop < SHOW_SCROLL_THRESHOLD) {
      dispatch(setShowScroll(false));
    }
  }, SCROLL_DEBOUNCE);

  const handleScrollButtonClick = useCallback(() => {
    if (trackerRef.current) {
      trackerRef.current.scrollTop = 0;
    }
  }, [trackerRef.current]);

  if (isLoading) {
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
              setQuery={setQuery}
            />
            <Footer />
          </div>
        </div>
        <Info />
      </div>
    </div>
  );
}
