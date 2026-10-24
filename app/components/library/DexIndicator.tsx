import { faStar } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import type { Dex } from "../../types";
import { tw } from "../../utils/tw";

const EXCLUDED_TAGS = ["regional", "game national", "full national"];

interface Props {
  dex: Dex;
}

const label = tw`ml-7 rounded-3 bg-gray-100 px-6 py-4 font-secondary text-10 font-medium uppercase dark:bg-night-04dp`;

export function DexIndicator({ dex }: Props) {
  return (
    <div className="ml-auto shrink-0 pl-30 max-500:hidden">
      {dex.shiny && (
        <FontAwesomeIcon
          className="text-8 text-red-700"
          icon={faStar}
          title="Shiny"
        />
      )}
      {[
        dex.dex_type.base_dex_type?.name || dex.dex_type.name,
        ...dex.dex_type.tags.filter((tag) => !EXCLUDED_TAGS.includes(tag)),
      ].map((tag) => (
        <span className={label} key={tag}>
          {tag.replace(/^customization-/g, "")}
        </span>
      ))}
      <span className={label}>{dex.game.name}</span>
    </div>
  );
}
