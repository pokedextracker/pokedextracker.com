import { FontAwesomeIcon }           from '@fortawesome/react-fontawesome';
import { faCaretLeft, faCaretRight } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector }  from 'react-redux';
import { useEffect }        from 'react';

import { EvolutionFamily }     from './evolution-family';
import { InfoLink }            from './info-link';
import { InfoLocations }       from './info-locations';
import { ReactGA }             from '../utils/analytics';
import { htmlName, iconClass } from '../utils/pokemon';
import { padding }             from '../utils/formatting';
import { retrievePokemon }     from '../actions/pokemon';
import { setShowInfo }         from '../actions/tracker';

export function Info () {
  const dispatch = useDispatch();

  const currentPokemon = useSelector(({ currentPokemon }) => currentPokemon);
  const dex = useSelector(({ currentDex, currentUser, users }) => users[currentUser].dexesBySlug[currentDex]);
  const pokemon = useSelector(({ currentPokemon, pokemon }) => pokemon[currentPokemon]);
  const showInfo = useSelector(({ showInfo }) => showInfo);
  const user = useSelector(({ currentUser, users }) => users[currentUser]);

  useEffect(() => {
    if (!pokemon) {
      dispatch(retrievePokemon(currentPokemon, {
        game_family: dex.game.game_family.id,
        regional: dex.regional
      }));
    }
  }, [currentPokemon, dex, pokemon]);

  const handleInfoClick = () => {
    ReactGA.event({ action: showInfo ? 'collapse' : 'uncollapse', category: 'Info' });
    dispatch(setShowInfo(!showInfo));
  };

  if (!pokemon) {
    return (
      <div className={`info ${showInfo ? '' : 'collapsed'}`}>
        <div className="info-collapse" onClick={handleInfoClick}>
          <FontAwesomeIcon icon={showInfo ? faCaretRight : faCaretLeft} />
        </div>

        <div className="info-main" />
      </div>
    );
  }

  return (
    <div className={`info ${showInfo ? '' : 'collapsed'}`}>
      <div className="info-collapse" onClick={handleInfoClick}>
        <FontAwesomeIcon icon={showInfo ? faCaretRight : faCaretLeft} />
      </div>

      <div className="info-main">
        <div className="info-header">
          <i className={iconClass(pokemon, dex)} />
          <h1>{htmlName(pokemon.name)}</h1>
          <h2>#{padding(pokemon.national_id, 3)}</h2>
        </div>

        <InfoLocations locations={pokemon.locations} />

        <EvolutionFamily family={pokemon.evolution_family} />

        <div className="info-footer">
          <InfoLink pokemon={pokemon} site={user.firstPokemonDB} />
          <InfoLink pokemon={pokemon} site={user.secondPokemonDB} />
        </div>
      </div>
    </div>
  );
}
