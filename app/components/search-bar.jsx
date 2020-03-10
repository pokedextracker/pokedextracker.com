import { FontAwesomeIcon }          from '@fortawesome/react-fontawesome';
import { faSearch, faTimes }        from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useRef }        from 'react';

import { ReactGA }  from '../utils/analytics';
import { setQuery } from '../actions/search';

export function SearchBar () {
  const dispatch = useDispatch();

  const inputRef = useRef(null);

  const query = useSelector(({ query }) => query);

  useEffect(() => {
    const handleKeyup = (e) => {
      if (e.target.tagName.toLowerCase() !== 'input' && e.key === '/') {
        ReactGA.event({ action: 'used shortcut', category: 'Search' });
        inputRef.current && inputRef.current.focus();
      }
    };

    document.addEventListener('keyup', handleKeyup);

    return () => document.removeEventListener('keyup', handleKeyup);
  }, [inputRef.current]);

  useEffect(() => {
    dispatch(setQuery(''));
  }, []);

  const handleInputChange = (e) => dispatch(setQuery(e.target.value));

  const handleClearClick = () => {
    dispatch(setQuery(''));
    inputRef.current && inputRef.current.focus();
  };

  return (
    <div className="dex-search-bar">
      <div className="wrapper">
        <div className="form-group">
          <FontAwesomeIcon icon={faSearch} />
          <input
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="form-control"
            id="search"
            name="search"
            onChange={handleInputChange}
            placeholder="Search by Pokémon name (press / to quick search)"
            ref={inputRef}
            spellCheck="false"
            type="text"
            value={query}
          />
          {query.length > 0 ?
            <a className="clear-btn" onClick={handleClearClick}>
              <FontAwesomeIcon icon={faTimes} />
            </a> :
            null
          }
        </div>
      </div>
    </div>
  );
}
