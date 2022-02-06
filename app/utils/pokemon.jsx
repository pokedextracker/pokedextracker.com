import classNames          from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Fragment }        from 'react';
import { faVenus, faMars } from '@fortawesome/free-solid-svg-icons';

import { BOX_SIZE } from '../components/box';
import { padding }  from './formatting';

function sortByGeneration (captureA, captureB) {
  if (captureA.pokemon.game_family.generation === captureB.pokemon.game_family.generation) {
    if (captureA.pokemon.dex_number > captureB.pokemon.dex_number) {
      return 1;
    }

    return -1;
  }

  if (captureA.pokemon.game_family.generation > captureB.pokemon.game_family.generation) {
    return 1;
  }

  return -1;

}

export function groupBoxes (captures, byGeneration = false) {
  let lastBoxName = null;
  let lastBoxIndex = 0;

  if (byGeneration === true) {
    captures = [...captures].sort(sortByGeneration)
  }

  return captures
    .reduce((all, capture) => {
    let boxIndex = all[lastBoxIndex].length === BOX_SIZE ? lastBoxIndex + 1 : lastBoxIndex;

    if (byGeneration === true &&
      all[boxIndex]?.length > 0 &&
      capture.pokemon.game_family.generation !== all[boxIndex][0].pokemon.game_family.generation)
    {
      boxIndex++;
    }

    if (capture.pokemon.box !== lastBoxName) {
      boxIndex++;
    }

    lastBoxName = capture.pokemon.box;
    lastBoxIndex = boxIndex;

    all[boxIndex] = all[boxIndex] || [];
    all[boxIndex].push(capture);
    return all;
  }, [[]]);
}

export function htmlName (name) {
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

export function iconClass ({ national_id: nationalId, form }, dex) {
  const classes = {
    'color-shiny': dex.shiny,
    [`form-${form}`]: Boolean(form)
  };

  return classNames('pkicon', `pkicon-${padding(nationalId, 3)}`, classes);
}
