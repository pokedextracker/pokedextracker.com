import { faMars, faVenus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { tw } from "../../utils/tw";

interface Props {
  name: string;
}

// The ♂ or ♀ after a name, as an icon a little smaller than the name.
const symbol = tw`relative bottom-1 left-3 text-[0.7em]`;

export function PokemonName({ name }: Props) {
  const male = name.indexOf("♂") > -1;
  const female = name.indexOf("♀") > -1;

  if (!male && !female) {
    return <>{name}</>;
  }

  return (
    <>
      {name.replace(/[♂♀]/g, "")}
      {male && <FontAwesomeIcon className={symbol} icon={faMars} />}
      {female && <FontAwesomeIcon className={symbol} icon={faVenus} />}
    </>
  );
}
