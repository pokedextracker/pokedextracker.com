import { useMemo } from 'react';

import { BOX_SIZE } from '../../../utils/pokemon';
import { MarkAllButton } from './MarkAllButton';
import { Pokemon } from './Pokemon';
import { padding } from '../../../utils/formatting';
import { useDeferredRender } from '../../../hooks/use-deferred-render';

import type { Dispatch, SetStateAction } from 'react';
import type { UICapture } from './use-tracker';

interface Props {
  captures: UICapture[];
  deferred?: boolean;
  dexTotal: number;
  setSelectedPokemon: Dispatch<SetStateAction<number>>;
}

export function Box ({ captures, deferred = false, dexTotal, setSelectedPokemon }: Props) {
  const render = useDeferredRender(!deferred);

  const empties = useMemo(() => Array.from({ length: BOX_SIZE - captures.length }).map((_, i) => i), [captures]);

  const paddingDigits = dexTotal >= 1000 ? 4 : 3;
  const firstPokemon = captures[0].pokemon;
  const lastPokemon = captures[captures.length - 1].pokemon;
  let title = firstPokemon.box;

  if (!title) {
    const firstNumber = firstPokemon.dex_number;
    const lastNumber = lastPokemon.dex_number;
    if (firstNumber === lastNumber) {
      title = padding(firstNumber, paddingDigits);
    } else {
      title = `${padding(firstNumber, paddingDigits)} - ${padding(lastNumber, paddingDigits)}`;
    }
  } else if (title.indexOf('reset') === 0) {
    const parts = title.split(':');
    const prefix = parts[2];

    if (firstPokemon.dex_number === lastPokemon.dex_number) {
      title = padding(firstPokemon.dex_number, paddingDigits);
    } else {
      title = `${padding(firstPokemon.dex_number, paddingDigits)} - ${padding(lastPokemon.dex_number, paddingDigits)}`;
    }

    if (prefix) {
      title = `${prefix} ${title}`;
    }
  }

  if (!render) {
    return null;
  }

  return (
    <div className="box">
      <div className="box-header">
        <h1>{title}</h1>
        <MarkAllButton captures={captures} />
      </div>
      <div className="box-container">
        {captures.map((capture) => <Pokemon capture={capture} key={capture.pokemon.id} setSelectedPokemon={setSelectedPokemon} />)}
        {empties.map((index) => <Pokemon capture={null} key={index} setSelectedPokemon={setSelectedPokemon} />)}
      </div>
    </div>
  );
}
