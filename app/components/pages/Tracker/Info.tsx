import {
  faCaretLeft,
  faCaretRight,
  faLongArrowAltRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import find from "lodash/find";
import keyBy from "lodash/keyBy";
import { useMemo, type Dispatch, type SetStateAction } from "react";

import { useLocalStorageContext } from "../../../hooks/contexts/use-local-storage-context";
import { usePokemon } from "../../../hooks/queries/pokemon";
import { useUser } from "../../../hooks/queries/users";
import { useUserParams } from "../../../hooks/use-user-params";
import type { Dex } from "../../../types";
import { trackEvent } from "../../../utils/analytics";
import { nationalId, padding, serebiiLink } from "../../../utils/formatting";
import { iconClass, infoIconCircle } from "../../../utils/pokemon";
import { tw } from "../../../utils/tw";
import { PokemonName } from "../../library/PokemonName";
import { EvolutionFamily } from "./EvolutionFamily";
import { InfoLocations } from "./InfoLocations";

const SEREBII_LINKS: Record<string, string> = {
  x_y: "pokedex-xy",
  omega_ruby_alpha_sapphire: "pokedex-xy",
  sun_moon: "pokedex-sm",
  ultra_sun_ultra_moon: "pokedex-sm",
  lets_go_pikachu_eevee: "pokedex-sm",
  sword_shield: "pokedex-swsh",
  sword_shield_expansion_pass: "pokedex-swsh",
  brilliant_diamond_shining_pearl: "pokedex-swsh",
  legends_arceus: "pokedex-swsh",
  scarlet_violet: "pokedex-sv",
  scarlet_violet_expansion_pass: "pokedex-sv",
  legends_za: "pokedex-sv",
  legends_za_expansion_pass: "pokedex-sv",
  home: "pokedex-sv",
};

interface Props {
  selectedPokemon: number;
  setSelectedPokemon: Dispatch<SetStateAction<number>>;
}

// The panel beside the dex, which a phone shows over it.
function infoClassName(showInfo: boolean): string {
  return classNames(
    "relative z-2 flex print:hidden max-400:absolute max-400:right-0 max-400:left-auto max-400:h-full",
    showInfo ? "max-400:w-full" : "max-400:w-[inherit]",
  );
}

// The tab that opens and closes the panel. Below 1100px the panel lies over
// the dex, so the open tab sits at its edge.
function collapseClassName(showInfo: boolean): string {
  return classNames(
    "flex items-center bg-info-edge p-8 text-12 text-white hover:-ml-2 hover:cursor-pointer hover:pr-10 max-1100:relative max-400:right-0 max-400:hover:ml-0 max-400:hover:pr-8",
    showInfo ? "max-1100:right-350" : "max-1100:right-0",
  );
}

function mainClassName(showInfo: boolean): string {
  return classNames(
    "w-350 flex-col bg-blue-600 text-white dark:bg-night-02dp max-1100:absolute max-1100:right-0 max-1100:h-full max-400:relative max-400:w-full",
    showInfo ? "flex" : "hidden",
  );
}

// The links to Bulbapedia and Serebii, side by side, and their arrows.
const footerLink = tw`w-1/2 border-info-edge bg-info-link p-20 text-center font-secondary text-11 font-bold tracking-1 text-white uppercase no-underline transition-all duration-100 ease-out no-touch:hover:bg-info-link-hover no-touch:focus:bg-info-link-hover`;
const footerIcon = tw`ml-3 text-10 transition-all duration-100 ease-out`;

export function Info({ selectedPokemon, setSelectedPokemon }: Props) {
  const { username, slug } = useUserParams();

  const user = useUser(username).data!;
  const dex = useMemo<Dex>(() => keyBy(user.dexes, "slug")[slug], [user, slug]);
  const { data: pokemon } = usePokemon(selectedPokemon, {
    dex_type: dex.dex_type.id,
  });

  const { showInfo, setShowInfo } = useLocalStorageContext();

  const serebiiPath = useMemo(() => {
    if (!pokemon) {
      return "";
    }

    const swshLocation = find(
      pokemon.locations,
      (loc) => loc.game.game_family.id === "sword_shield",
    );
    const bdspLocation = find(
      pokemon.locations,
      (loc) => loc.game.game_family.id === "brilliant_diamond_shining_pearl",
    );
    const plaLocation = find(
      pokemon.locations,
      (loc) => loc.game.game_family.id === "legends_arceus",
    );
    const gen9Location = find(pokemon.locations, (loc) =>
      [
        "scarlet_violet",
        "scarlet_violet_expansion_pass",
        "legends_za",
        "legends_za_expansion_pass",
      ].includes(loc.game.game_family.id),
    );

    if (dex.game.game_family.id === "home" && !gen9Location) {
      if (
        swshLocation &&
        swshLocation.value.length > 0 &&
        swshLocation.value[0] === "Currently unavailable" &&
        !bdspLocation &&
        !plaLocation
      ) {
        // If the Pokemon's location is 'Currently unavailable' for SwSh and they
        // don't have locations for any other gen8 game, that means they aren't
        // available in this generation, so they don't have a gen8 Serebii page.
        // Because of this, we go back to the SuMo Serebii links. This will
        // probably need to be updating with future generations.
        return "pokedex-sm";
      }

      // This is a HOME dex, there is no gen9 location, and there is a gen8
      // location, so we use the SwSh link.
      return "pokedex-swsh";
    }

    return SEREBII_LINKS[dex.game.game_family.id];
  }, [dex, pokemon]);

  const handleInfoClick = () => {
    trackEvent("Info", showInfo ? "collapse" : "uncollapse");
    setShowInfo(!showInfo);
  };

  if (!pokemon) {
    return (
      <div
        className={infoClassName(showInfo)}
        data-collapsed={!showInfo}
        data-testid="info"
      >
        <div
          className={collapseClassName(showInfo)}
          data-testid="info-toggle"
          onClick={handleInfoClick}
        >
          <FontAwesomeIcon icon={showInfo ? faCaretRight : faCaretLeft} />
        </div>

        <div className={mainClassName(showInfo)} data-testid="info-main" />
      </div>
    );
  }

  return (
    <div
      className={infoClassName(showInfo)}
      data-collapsed={!showInfo}
      data-testid="info"
    >
      <div
        className={collapseClassName(showInfo)}
        data-testid="info-toggle"
        onClick={handleInfoClick}
      >
        <FontAwesomeIcon icon={showInfo ? faCaretRight : faCaretLeft} />
      </div>

      <div className={mainClassName(showInfo)} data-testid="info-main">
        <div className="flex shrink-0 items-center border-b-2 border-info-edge bg-info pt-17 pr-17 pb-17 pl-8">
          <i
            className={`${iconClass(pokemon, dex, infoIconCircle)} mx-12 my-0`}
          />
          <h1 className="m-0 grow text-32 font-medium" data-testid="info-name">
            <PokemonName name={pokemon.name} />
          </h1>
          <h2 className="m-0 font-secondary text-17 font-normal">
            #
            {padding(
              dex.dex_type.tags.includes("regional")
                ? pokemon.dex_number === -1
                  ? "---"
                  : pokemon.dex_number
                : nationalId(pokemon.national_id),
              dex.total >= 1000 ? 4 : 3,
            )}
          </h2>
        </div>

        <InfoLocations locations={pokemon.locations} />

        <EvolutionFamily
          family={pokemon.evolution_family}
          setSelectedPokemon={setSelectedPokemon}
        />

        <div className="mt-auto flex shrink-0 border-t-2 border-info-edge bg-info">
          <a
            className={`${footerLink} border-r`}
            href={`http://bulbapedia.bulbagarden.net/wiki/${encodeURI(pokemon.name)}_(Pok%C3%A9mon)`}
            onClick={() =>
              trackEvent("Info", "open Bulbapedia link", pokemon.name)
            }
            rel="noopener noreferrer"
            target="_blank"
          >
            {"Bulbapedia "}
            <FontAwesomeIcon
              className={footerIcon}
              icon={faLongArrowAltRight}
            />
          </a>
          <a
            className={`${footerLink} border-l`}
            href={serebiiLink(serebiiPath, pokemon.national_id)}
            onClick={() =>
              trackEvent("Info", "open Serebii link", pokemon.name)
            }
            rel="noopener noreferrer"
            target="_blank"
          >
            {"Serebii "}
            <FontAwesomeIcon
              className={footerIcon}
              icon={faLongArrowAltRight}
            />
          </a>
        </div>
      </div>
    </div>
  );
}
