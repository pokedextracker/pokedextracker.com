import classNames from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Fragment } from 'react';
import { faVenus, faMars } from '@fortawesome/free-solid-svg-icons';

import { BOX_SIZE } from '../components/pages/Tracker/Box';
import { padding } from './formatting';

export function groupBoxes (captures) {
  let lastBoxName = null;
  let lastBoxIndex = 0;

  return captures.reduce((all, capture) => {
    let boxIndex = all[lastBoxIndex].length === BOX_SIZE ? lastBoxIndex + 1 : lastBoxIndex;

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
    [`form-${form}`]: Boolean(form),
    [`game-family-${dex.dex_type.game_family_id}`]: true,
  };

  return classNames('pkicon', `pkicon-${padding(nationalId, 3)}`, classes);
}
