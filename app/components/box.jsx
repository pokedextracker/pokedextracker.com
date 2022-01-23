import PropTypes       from 'prop-types';
import { useMemo }     from 'react';
import { useSelector } from 'react-redux';

import { MarkAllButton }     from './mark-all-button';
import { Pokemon }           from './pokemon';
import { padding }           from '../utils/formatting';
import { useDeferredRender } from '../hooks/use-deferred-render';

export const BOX_SIZE = 30;

export function Box ({ captures, deferred }) {
  const render = useDeferredRender(!deferred);

  const dex = useSelector(({ currentDex, currentUser, users }) => users[currentUser].dexesBySlug[currentDex]);

  const empties = useMemo(() => Array.from({ length: BOX_SIZE - captures.length }).map((_, i) => i), [captures]);

  const regional = dex.dex_type.tags.includes('regional');
  const firstPokemon = captures[0].pokemon;
  const lastPokemon = captures[captures.length - 1].pokemon;
  let title = firstPokemon.box;

  if (!title) {
    const firstNumber = regional ? firstPokemon[`${dex.game.game_family.id}_id`] : firstPokemon.national_id;
    const lastNumber = regional ? lastPokemon[`${dex.game.game_family.id}_id`] : lastPokemon.national_id;
    if (firstNumber === lastNumber) {
      title = padding(firstNumber, 3);
    } else {
      title = `${padding(firstNumber, 3)} - ${padding(lastNumber, 3)}`;
    }
  } else if (title.indexOf('reset') === 0) {
    const parts = title.split(':');
    const offset = parseInt(parts[1]);
    const prefix = parts[2];

    let firstNumber = regional ? firstPokemon[`${dex.game.game_family.id}_id`] : firstPokemon.national_id;
    let lastNumber = regional ? lastPokemon[`${dex.game.game_family.id}_id`] : lastPokemon.national_id;

    firstNumber -= offset;
    lastNumber -= offset;

    if (firstNumber === lastNumber) {
      title = padding(firstNumber, 3);
    } else {
      title = `${padding(firstNumber, 3)} - ${padding(lastNumber, 3)}`;
    }

    if (prefix) {
      title = `${prefix} ${title}`;
    }
  }

  if (!render) {
    return null;
  }

  return (
    <div className="box">
      <div className="box-header">
        <h1>{title}</h1>
        <MarkAllButton captures={captures} />
      </div>
      <div className="box-container">
        {captures.map((capture) => <Pokemon capture={capture} key={capture.pokemon.id} />)}
        {empties.map((index) => <Pokemon capture={null} key={index} />)}
      </div>
    </div>
  );
}

Box.defaultProps = {
  deferred: false
};

Box.propTypes = {
  captures: PropTypes.arrayOf(PropTypes.object).isRequired,
  deferred: PropTypes.bool
};
