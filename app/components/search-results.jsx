import PropTypes from 'prop-types';
import { useMemo } from 'react';

import { Pokemon } from './pokemon';
import { nationalId, padding } from '../utils/formatting';

const DEFER_CUTOFF = 120;

export function SearchResults ({ captures, hideCaught, query, setHideCaught, setQuery }) {
  const handleClearCaughtFilter = () => setHideCaught(false);
  const handleClearClick = () => setQuery('');

  const filteredCaptures = useMemo(() => {
    return captures.filter((capture) => {
      const dexId = capture.pokemon.dex_number;
      const natId = nationalId(capture.pokemon.national_id);

      const matchesCaught = !hideCaught || !capture.captured;
      const matchesQuery =
        // Case-insensitive name prefix match (e.g. bulba)
        capture.pokemon.name.toLowerCase().indexOf(query.toLowerCase()) === 0 ||
        // Exact dex ID match (e.g. 1, 2, 3)
        dexId.toString() === query ||
        // Exact national ID match (e.g. 1, 2, 3)
        natId.toString() === query ||
        // Exact 3-digit formatted dex ID match (e.g. 001, 002, 003)
        padding(dexId, 3) === query ||
        // Exact 4-digit formatted dex ID match (e.g. 0001, 0002, 0003)
        padding(dexId, 4) === query ||
        // Exact 3-digit formatted national ID match (e.g. 001, 002, 003)
        padding(natId, 3) === query ||
        // Exact 4-digit formatted national ID match (e.g. 0001, 0002, 0003)
        padding(natId, 4) === query;

      return matchesCaught && matchesQuery;
    });
  }, [captures, hideCaught, query]);

  if (filteredCaptures.length === 0) {
    let message = <p>No results. <a className="link" onClick={handleClearClick}>Clear your search?</a></p>;

    if (hideCaught) {
      if (query) {
        message = <p>No results in uncaught Pokémon. <a className="link" onClick={handleClearCaughtFilter}>Include caught Pokémon</a> or <a className="link" onClick={handleClearClick}>clear your search</a>?</p>;
      } else {
        message = <p>No uncaught Pokémon. <a className="link" onClick={handleClearCaughtFilter}>Show all Pokémon?</a></p>;
      }
    }

    return (
      <div className="search-results search-results-empty">
        {message}
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
  setHideCaught: PropTypes.func.isRequired,
  setQuery: PropTypes.func.isRequired,
};
