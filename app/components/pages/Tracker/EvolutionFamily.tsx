import keyBy from 'lodash/keyBy';
import { useMemo } from 'react';
import { useParams } from 'react-router';

import { Evolutions } from './Evolutions';
import { iconClass } from '../../../utils/pokemon';
import { useUser } from '../../../hooks/queries/users';

import type { Dispatch, SetStateAction } from 'react';
import type { EvolutionFamily as EvolutionFamilyType } from '../../../types';

interface Props {
  family: EvolutionFamilyType;
  setSelectedPokemon: Dispatch<SetStateAction<number>>;
}

export function EvolutionFamily ({ family, setSelectedPokemon }: Props) {
  const { username, slug } = useParams<{ username: string; slug: string }>();

  const user = useUser(username).data!;
  const dex = useMemo(() => keyBy(user.dexes, 'slug')[slug], [user, slug]);

  let column1 = null;
  let column2 = null;

  if (family.pokemon.length > 1) {
    column1 = (
      <div className="evolution-pokemon-column">
        {family.pokemon[1].map((pokemon) => (<a key={pokemon.id} onClick={() => setSelectedPokemon(pokemon.id)} title={pokemon.name}>
          <i className={iconClass(pokemon, dex)} />
        </a>))}
      </div>
    );
  }

  if (family.pokemon.length > 2) {
    column2 = (
      // styling hack for mr.rime
      <div className={`evolution-pokemon-column ${family.pokemon[2][0].national_id === 866 ? 'push' : ''}`}>
        {family.pokemon[2].map((pokemon) => (<a key={pokemon.id} onClick={() => setSelectedPokemon(pokemon.id)} title={pokemon.name}>
          <i className={iconClass(pokemon, dex)} />
        </a>))}
      </div>
    );
  }

  return (
    <div className="info-evolutions">
      <div className="evolution-pokemon-column">
        <a onClick={() => setSelectedPokemon(family.pokemon[0][0].id)} title={family.pokemon[0][0].name}>
          <i className={iconClass(family.pokemon[0][0], dex)} />
        </a>
        {family.evolutions.length === 0 ? <div>Does not evolve</div> : null}
      </div>
      {family.evolutions.length > 0 ? <Evolutions evolutions={family.evolutions[0]} /> : null}
      {column1}
      {family.evolutions.length > 1 ? <Evolutions evolutions={family.evolutions[1]} pokemonId={family.pokemon[2][0].national_id} /> : null}
      {column2}
    </div>
  );
}
