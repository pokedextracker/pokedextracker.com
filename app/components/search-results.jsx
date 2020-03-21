import PropTypes   from 'prop-types';
import { useMemo } from 'react';

import { Pokemon } from './pokemon';

const DEFER_CUTOFF = 120;

export function SearchResults ({ captures, hideCaught, query, setQuery }) {
  const handleClearClick = () => setQuery('');

  const filteredCaptures = useMemo(() => {
    return captures.filter((capture) => {
      const matchesCaught = !hideCaught || !capture.captured;
      const matchesQuery = capture.pokemon.name.toLowerCase().indexOf(query) === 0;

      return matchesCaught && matchesQuery;
    });
  }, [captures, hideCaught, query]);

  if (filteredCaptures.length === 0) {
    return (
      <div className="search-results search-results-empty">
        <p>No results. <a className="link" onClick={handleClearClick}>Clear your search?</a></p>
      </div>
    );
  }

  return (
    <div className="search-results">
      {filteredCaptures.map((capture, i) => (
        <Pokemon
          capture={capture}
          delay={i > DEFER_CUTOFF ? 5 : 0}
          key={capture.pokemon.id}
        />
      ))}
    </div>
  );
}

SearchResults.propTypes = {
  captures: PropTypes.arrayOf(PropTypes.object).isRequired,
  hideCaught: PropTypes.bool.isRequired,
  query: PropTypes.string.isRequired,
  setQuery: PropTypes.func.isRequired
};
