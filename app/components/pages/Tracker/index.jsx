import keyBy from 'lodash/keyBy';
import throttle from 'lodash/throttle';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';

import { Dex } from './Dex';
import { Footer } from '../../library/Footer';
import { Info } from './Info';
import { Nav } from '../../library/Nav';
import { NotFound } from '../NotFound';
import { Reload } from '../../library/Reload';
import { SCROLL_DEBOUNCE, SHOW_SCROLL_THRESHOLD } from './Scroll';
import { SearchBar } from './SearchBar';
import { checkVersion } from '../../../actions/utils';
import { clearPokemon, setCurrentPokemon } from '../../../actions/pokemon';
import { listCaptures } from '../../../actions/capture';
import { retrieveDex, setCurrentDex } from '../../../actions/dex';
import { setShowScroll } from '../../../actions/tracker';
import { useUser } from '../../../hooks/queries/users';

export function Tracker () {
  const dispatch = useDispatch();

  const { username, slug } = useParams();

  const trackerRef = useRef(null);

  const {
    data: user,
    isLoading: userIsLoading,
  } = useUser(username);

  const dex = useMemo(() => keyBy(user.dexes, 'slug')[slug], [user, slug]);

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
      dispatch(setCurrentDex(slug, username));

      try {
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

  if (isLoading || userIsLoading) {
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
            />
            <Footer />
          </div>
        </div>
        <Info />
      </div>
    </div>
  );
}
