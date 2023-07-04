import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Fragment } from 'react';
import { faVenus, faMars } from '@fortawesome/free-solid-svg-icons';

interface Props {
  name: string;
}

export function PokemonName ({ name }: Props) {
  const male = name.indexOf('♂') > -1;
  const female = name.indexOf('♀') > -1;

  if (!male && !female) {
    return name;
  }

  return (
    <Fragment>
      {name.replace(/[♂♀]/g, '')}
      {male && <FontAwesomeIcon icon={faMars} />}
      {female && <FontAwesomeIcon icon={faVenus} />}
    </Fragment>
  );
}
