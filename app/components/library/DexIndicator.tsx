import { faStar } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import type { Dex } from "../../types";
import { tw } from "../../utils/tw";

const EXCLUDED_TAGS = ["regional", "game national", "full national"];

interface Props {
  // Its place on the page, which differs between the profile and a dex.
  className: string;
  dex: Dex;
  // Under a dex's title, the tags get a line of their own: they wrap as whole
  // tags, and the shiny star follows them instead of leading.
  ownLine?: boolean;
}

const label = tw`rounded-3 bg-gray-100 px-5 py-5 font-secondary text-10 font-medium uppercase dark:bg-night-04dp`;

export function DexIndicator({ className, dex, ownLine = false }: Props) {
  const star = dex.shiny && (
    <FontAwesomeIcon
      className="text-8 text-red-700"
      icon={faStar}
      title="Shiny"
    />
  );
  const tagClassName = ownLine ? label : `${label} ml-8`;

  return (
    <div
      className={
        ownLine
          ? `flex flex-wrap items-center gap-x-8 gap-y-5 ${className}`
          : className
      }
    >
      {!ownLine && star}
      {[
        dex.dex_type.base_dex_type?.name || dex.dex_type.name,
        ...dex.dex_type.tags.filter((tag) => !EXCLUDED_TAGS.includes(tag)),
      ].map((tag) => (
        <span className={tagClassName} key={tag}>
          {tag.replace(/^customization-/g, "")}
        </span>
      ))}
      <span className={tagClassName}>{dex.game.name}</span>
      {ownLine && star}
    </div>
  );
}
