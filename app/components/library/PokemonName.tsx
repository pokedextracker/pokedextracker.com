import { faMars, faVenus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface Props {
  name: string;
}

export function PokemonName({ name }: Props) {
  const male = name.indexOf("♂") > -1;
  const female = name.indexOf("♀") > -1;

  if (!male && !female) {
    return <>{name}</>;
  }

  return (
    <>
      {name.replace(/[♂♀]/g, "")}
      {male && <FontAwesomeIcon icon={faMars} />}
      {female && <FontAwesomeIcon icon={faVenus} />}
    </>
  );
}
