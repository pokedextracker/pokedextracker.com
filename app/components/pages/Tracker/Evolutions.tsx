import uniqBy from 'lodash/uniqBy';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLongArrowAltLeft, faLongArrowAltRight, faPlusCircle } from '@fortawesome/free-solid-svg-icons';

import { capitalize } from '../../../utils/formatting';

import type { Evolution } from '../../../types';

function evolutionKey (evolution: Evolution) {
  return `${evolution.trigger}:${evolution.level}:${evolution.stone}:${evolution.held_item}:${evolution.notes}`;
}

interface Props {
  evolutions: Evolution[];
  pokemonId?: number;
}

export function Evolutions ({ evolutions, pokemonId }: Props) {
  const elements = uniqBy(evolutions, evolutionKey).map((evolution) => {
    const key = evolutionKey(evolution);
    let trigger = null;
    let notes = null;

    switch (evolution.trigger) {
      case 'level':
        trigger = <span>Level Up {evolution.level ? `to ${evolution.level} ` : ''}</span>;
        break;
      case 'stone':
        trigger = <span>{capitalize(evolution.stone!)} Stone </span>;
        break;
      case 'candy':
        trigger = <span>{evolution.candy_count} Candies </span>;
        break;
      case 'other':
        break;
      default:
        trigger = <span>{capitalize(evolution.trigger)} </span>;
    }

    if (evolution.notes) {
      if (evolutions.length <= 3) {
        notes = <span>{evolution.notes}</span>;
      } else {
        notes = (
          <div className="tooltip">
            <FontAwesomeIcon icon={faPlusCircle} />
            <span className="tooltip-text">{evolution.notes}</span>
          </div>
        );
      }
    }

    return (
      <div className="evolution-trigger" key={key}>
        <FontAwesomeIcon icon={evolution.trigger === 'breed' ? faLongArrowAltLeft : faLongArrowAltRight} />
        <div>
          {trigger}
          {evolution.held_item ? <span>holding {capitalize(evolution.held_item)} </span> : null}
          {notes}
        </div>
      </div>
    );
  });

  return (
    // styling hack for mr.rime
    <div className={`evolution-trigger-column ${pokemonId === 866 ? 'push' : ''}`}>{elements}</div>
  );
}
