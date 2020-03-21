import PropTypes             from 'prop-types';
import { FontAwesomeIcon }   from '@fortawesome/react-fontawesome';
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useRef } from 'react';

import { ReactGA }  from '../utils/analytics';

export function SearchBar ({ hideCaught, query, setHideCaught, setQuery }) {
  const inputRef = useRef(null);

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

  const handleInputChange = (e) => setQuery(e.target.value);
  const handleHideCaughtChange = (e) => setHideCaught(e.target.checked);

  const handleClearClick = () => {
    setQuery('');
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
        <div className="form-group">
          <label>
            <input
              id="hide-caught"
              name="hide-caught"
              onChange={handleHideCaughtChange}
              type="checkbox"
              value={hideCaught}
            />
            <span><span /></span>Hide Caught
          </label>
        </div>
      </div>
    </div>
  );
}

SearchBar.propTypes = {
  hideCaught: PropTypes.bool.isRequired,
  query: PropTypes.string.isRequired,
  setHideCaught: PropTypes.func.isRequired,
  setQuery: PropTypes.func.isRequired
};
