import find                    from 'lodash/find';
import { faLongArrowAltRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon }     from '@fortawesome/react-fontawesome';
import { useSelector }         from 'react-redux';
import { useMemo }             from 'react';

import { ReactGA }             from '../utils/analytics';
import { padding }             from '../utils/formatting';

export function InfoLink ({ site, pokemon }) {
  const dex = useSelector(({ currentDex, currentUser, users }) => users[currentUser].dexesBySlug[currentDex]);
  const SEREBII_LINKS = {
    x_y: 'pokedex-xy',
    omega_ruby_alpha_sapphire: 'pokedex-xy',
    sun_moon: 'pokedex-sm',
    ultra_sun_ultra_moon: 'pokedex-sm',
    lets_go_pikachu_eevee: 'pokedex-sm',
    sword_shield: 'pokedex-swsh',
    sword_shield_expansion_pass: 'pokedex-swsh'
  };

  const serebiiPath = useMemo(() => {
    if (!pokemon) {
      return null;
    }

    const swshLocation = find(pokemon.locations, (loc) => loc.game.game_family.id === 'sword_shield');

    // If the Pokemon's location is 'Currently unavailable' for SwSh, that means
    // they aren't available in this game because of dexit, so we go back to the
    // the SuMo Serebii links. This will probably need to be updating with
    // future generations.
    if (swshLocation && swshLocation.value.length > 0 && swshLocation.value[0] === 'Currently unavailable') {
      return 'pokedex-sm';
    }

    return SEREBII_LINKS[dex.game.game_family.id];
  }, [dex, pokemon]);

  switch (site) {
    case 'Bulbapedia':
      return (<a href={`https://bulbapedia.bulbagarden.net/wiki/${encodeURI(pokemon.name)}_(Pok%C3%A9mon)`}
        onClick={() => ReactGA.event({ action: 'open Bulbapedia link', category: 'Info', label: pokemon.name })}
        rel="noopener noreferrer"
        target="_blank">
        Bulbapedia <FontAwesomeIcon icon={faLongArrowAltRight} />
      </a>
      );
    case 'Serebii':
      return (<a href={`https://www.serebii.net/${serebiiPath}/${padding(pokemon.national_id, 3)}.shtml`}
        onClick={() => ReactGA.event({ action: 'open Serebii link', category: 'Info', label: pokemon.name })}
        rel="noopener noreferrer"
        target="_blank">
        Serebii <FontAwesomeIcon icon={faLongArrowAltRight} />
      </a>
      );
    case 'PokemonDB':
      return (<a href={`https://pokemondb.net/pokedex/${encodeURI(pokemon.name)}`}
        onClick={() => ReactGA.event({ action: 'open PokemonDB link', category: 'Info', label: pokemon.name })}
        rel="noopener noreferrer"
        target="_blank">
        PokémonDB <FontAwesomeIcon icon={faLongArrowAltRight} />
      </a>
      );
  }
}
