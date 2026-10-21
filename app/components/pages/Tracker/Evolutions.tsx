import {
  faLongArrowAltLeft,
  faLongArrowAltRight,
  faPlusCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import uniqBy from "lodash/uniqBy";

import type { Evolution } from "../../../types";
import { capitalize } from "../../../utils/formatting";
import { Tooltip } from "../../library/Tooltip";

function evolutionKey(evolution: Evolution) {
  return `${evolution.trigger}:${evolution.level}:${evolution.stone}:${evolution.held_item}:${evolution.notes}`;
}

interface Props {
  evolutions: Evolution[];
  pokemonId?: number;
}

export function Evolutions({ evolutions, pokemonId }: Props) {
  const elements = uniqBy(evolutions, evolutionKey).map((evolution) => {
    const key = evolutionKey(evolution);
    let trigger = null;
    let notes = null;

    switch (evolution.trigger) {
      case "level":
        trigger = (
          <span>
            Level Up {evolution.level ? `to ${evolution.level} ` : ""}
          </span>
        );
        break;
      case "stone":
        trigger = <span>{capitalize(evolution.stone!)} Stone </span>;
        break;
      case "candy":
        trigger = <span>{evolution.candy_count} Candies </span>;
        break;
      case "other":
        break;
      default:
        trigger = <span>{capitalize(evolution.trigger)} </span>;
    }

    if (evolution.notes) {
      if (evolutions.length <= 3) {
        notes = <span>{evolution.notes}</span>;
      } else {
        notes = (
          <Tooltip
            data-testid="evolution-notes"
            icon={faPlusCircle}
            iconClassName="text-11 text-white"
            variant="light"
          >
            {evolution.notes}
          </Tooltip>
        );
      }
    }

    return (
      <div
        className="mx-0 my-8 flex flex-col justify-center first:mt-0 last:mb-0"
        key={key}
      >
        <FontAwesomeIcon
          className="mb-3 w-[unset]"
          icon={
            evolution.trigger === "breed"
              ? faLongArrowAltLeft
              : faLongArrowAltRight
          }
        />
        <div>
          {trigger}
          {evolution.held_item ? (
            <span>holding {capitalize(evolution.held_item)} </span>
          ) : null}
          {notes}
        </div>
      </div>
    );
  });

  return (
    // styling hack for mr.rime
    <div
      className={`flex max-w-90 grow flex-col ${pokemonId === 866 ? "justify-end" : "justify-around"}`}
    >
      {elements}
    </div>
  );
}
