import find                                               from 'lodash/find';
import { FontAwesomeIcon }                                from '@fortawesome/react-fontawesome';
import { faCaretLeft, faCaretRight, faLongArrowAltRight } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector }                       from 'react-redux';
import { useEffect, useMemo }                             from 'react';

import { EvolutionFamily }     from './evolution-family';
import { InfoLocations }       from './info-locations';
import { ReactGA }             from '../utils/analytics';
import { htmlName, iconClass } from '../utils/pokemon';
import { padding }             from '../utils/formatting';
import { retrievePokemon }     from '../actions/pokemon';
import { setShowInfo }         from '../actions/tracker';

const SEREBII_LINKS = {
  x_y: 'pokedex-xy',
  omega_ruby_alpha_sapphire: 'pokedex-xy',
  sun_moon: 'pokedex-sm',
  ultra_sun_ultra_moon: 'pokedex-sm',
  lets_go_pikachu_eevee: 'pokedex-sm',
  sword_shield: 'pokedex-swsh',
  sword_shield_expansion_pass: 'pokedex-swsh',
  brilliant_diamond_shining_pearl: 'pokedex-swsh',
  legends_arceus: 'pokedex-swsh',
  home: 'pokedex-swsh'
};

export function Info () {
  const dispatch = useDispatch();

  const currentPokemon = useSelector(({ currentPokemon }) => currentPokemon);
  const dex = useSelector(({ currentDex, currentUser, users }) => users[currentUser].dexesBySlug[currentDex]);
  const pokemon = useSelector(({ currentPokemon, pokemon }) => pokemon[currentPokemon]);
  const showInfo = useSelector(({ showInfo }) => showInfo);

  useEffect(() => {
    if (!pokemon) {
      dispatch(retrievePokemon(currentPokemon, {
        dex_type: dex.dex_type.id
      }));
    }
  }, [currentPokemon, dex, pokemon]);

  const serebiiPath = useMemo(() => {
    if (!pokemon) {
      return null;
    }

    const swshLocation = find(pokemon.locations, (loc) => loc.game.game_family.id === 'sword_shield');
    const bdspLocation = find(pokemon.locations, (loc) => loc.game.game_family.id === 'brilliant_diamond_shining_pearl');
    const plaLocation = find(pokemon.locations, (loc) => loc.game.game_family.id === 'legends_arceus');

    // If the Pokemon's location is 'Currently unavailable' for SwSh and they
    // don't have locations for any other gen8 game, that means they aren't
    // available in this generation, so they don't have a gen8 Serebii page.
    // Because of this, we go back to the the SuMo Serebii links. This will
    // probably need to be updating with future generations.
    if (swshLocation && swshLocation.value.length > 0 && swshLocation.value[0] === 'Currently unavailable' && !bdspLocation && !plaLocation) {
      return 'pokedex-sm';
    }

    return SEREBII_LINKS[dex.game.game_family.id];
  }, [dex, pokemon]);

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
          <a
            href={`http://bulbapedia.bulbagarden.net/wiki/${encodeURI(pokemon.name)}_(Pok%C3%A9mon)`}
            onClick={() => ReactGA.event({ action: 'open Bulbapedia link', category: 'Info', label: pokemon.name })}
            rel="noopener noreferrer"
            target="_blank"
          >
            Bulbapedia <FontAwesomeIcon icon={faLongArrowAltRight} />
          </a>
          <a
            href={`http://www.serebii.net/${serebiiPath}/${padding(pokemon.national_id, 3)}.shtml`}
            onClick={() => ReactGA.event({ action: 'open Serebii link', category: 'Info', label: pokemon.name })}
            rel="noopener noreferrer"
            target="_blank"
          >
            Serebii <FontAwesomeIcon icon={faLongArrowAltRight} />
          </a>
        </div>
      </div>
    </div>
  );
}
