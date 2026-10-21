import classNames from "classnames";

import type { Capture, Dex } from "../types";
import { padding } from "./formatting";
import { tw } from "./tw";

export const BOX_SIZE = 30;

export function groupBoxes(captures: Capture[]) {
  let lastBoxName: string | null = null;
  let lastBoxIndex = 0;

  return captures.reduce<Capture[][]>(
    (all, capture) => {
      let boxIndex =
        all[lastBoxIndex].length === BOX_SIZE ? lastBoxIndex + 1 : lastBoxIndex;

      if (capture.pokemon.box !== lastBoxName) {
        boxIndex++;
      }

      lastBoxName = capture.pokemon.box;
      lastBoxIndex = boxIndex;

      all[boxIndex] = all[boxIndex] || [];
      all[boxIndex].push(capture);
      return all;
    },
    [[]],
  );
}

interface Pokemon {
  national_id: number;
  form: string | null;
}

// The circle behind a Legends: Arceus icon in the info panel. Those icons sit
// in a circle, whose color depends on what's behind it.
export const infoIconCircle = tw`bg-[rgba(241,241,241,0.3)]`;

// iconClass is the sprite for a Pokémon in a dex, with circle as its
// background if it's a Legends: Arceus icon.
export function iconClass(
  { national_id: nationalId, form }: Pokemon,
  dex: Dex,
  circle = "",
) {
  const classes = {
    "color-shiny": dex.shiny,
    [`form-${form}`]: Boolean(form),
    [`game-family-${dex.dex_type.game_family_id}`]: true,
  };

  return classNames(
    "pkicon",
    `pkicon-${padding(nationalId, 3)}`,
    classes,
    dex.dex_type.game_family_id === "legends_arceus" && circle,
  );
}
