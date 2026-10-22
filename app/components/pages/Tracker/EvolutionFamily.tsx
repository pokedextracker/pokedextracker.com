import keyBy from "lodash/keyBy";
import { useMemo, type Dispatch, type SetStateAction } from "react";

import { useUser } from "../../../hooks/queries/users";
import { useUserParams } from "../../../hooks/use-user-params";
import type { EvolutionFamily as EvolutionFamilyType } from "../../../types";
import { iconClass, infoIconCircle } from "../../../utils/pokemon";
import { tw } from "../../../utils/tw";
import { Evolutions } from "./Evolutions";

interface Props {
  family: EvolutionFamilyType;
  setSelectedPokemon: Dispatch<SetStateAction<number>>;
}

// A column of a family's Pokémon, spread out unless it sits at the bottom.
// Melmetal's icon sits a little to the right.
const pokemonColumn = tw`flex flex-col [&_.pkicon-809]:ml-3`;
const pokemonLink = tw`cursor-pointer px-5 py-0`;

export function EvolutionFamily({ family, setSelectedPokemon }: Props) {
  const { username, slug } = useUserParams();

  const user = useUser(username).data!;
  const dex = useMemo(() => keyBy(user.dexes, "slug")[slug], [user, slug]);

  let column1 = null;
  let column2 = null;

  if (family.pokemon.length > 1) {
    column1 = (
      <div className={`${pokemonColumn} justify-around`}>
        {family.pokemon[1].map((pokemon) => (
          <a
            className={pokemonLink}
            key={pokemon.id}
            onClick={() => setSelectedPokemon(pokemon.id)}
            title={pokemon.name}
          >
            <i className={iconClass(pokemon, dex, infoIconCircle)} />
          </a>
        ))}
      </div>
    );
  }

  if (family.pokemon.length > 2) {
    column2 = (
      // styling hack for mr.rime
      <div
        className={`${pokemonColumn} ${family.pokemon[2][0].national_id === 866 ? "justify-end" : "justify-around"}`}
      >
        {family.pokemon[2].map((pokemon) => (
          <a
            className={pokemonLink}
            key={pokemon.id}
            onClick={() => setSelectedPokemon(pokemon.id)}
            title={pokemon.name}
          >
            <i className={iconClass(pokemon, dex, infoIconCircle)} />
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 justify-center bg-info p-20 text-center text-13">
      <div className={`${pokemonColumn} justify-around`}>
        <a
          className={pokemonLink}
          onClick={() => setSelectedPokemon(family.pokemon[0][0].id)}
          title={family.pokemon[0][0].name}
        >
          <i className={iconClass(family.pokemon[0][0], dex, infoIconCircle)} />
        </a>
        {family.evolutions.length === 0 ? <div>Does not evolve</div> : null}
      </div>
      {family.evolutions.length > 0 ? (
        <Evolutions evolutions={family.evolutions[0]} />
      ) : null}
      {column1}
      {family.evolutions.length > 1 ? (
        <Evolutions
          evolutions={family.evolutions[1]}
          pokemonId={family.pokemon[2][0].national_id}
        />
      ) : null}
      {column2}
    </div>
  );
}
