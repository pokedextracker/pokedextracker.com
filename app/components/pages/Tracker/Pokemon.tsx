import classNames from 'classnames';
import keyBy from 'lodash/keyBy';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfo } from '@fortawesome/free-solid-svg-icons';
import { useMemo } from 'react';
import { useParams } from 'react-router';

import { PokemonName } from '../../library/PokemonName';
import { ReactGA } from '../../../utils/analytics';
import { iconClass } from '../../../utils/pokemon';
import { nationalId, padding } from '../../../utils/formatting';
import { useCreateCapture, useDeleteCapture } from '../../../hooks/queries/captures';
import { useDelayedRender } from '../../../hooks/use-delayed-render';
import { useLocalStorageContext } from '../../../hooks/contexts/use-local-storage-context';
import { useSession } from '../../../hooks/contexts/use-session';
import { useTrackerContext } from './use-tracker';
import { useUser } from '../../../hooks/queries/users';

import type { Dex } from '../../../types';
import type { Dispatch, SetStateAction } from 'react';
import type { UICapture } from './use-tracker';

interface Props {
  capture: UICapture | null;
  delay?: number;
  setSelectedPokemon: Dispatch<SetStateAction<number>>;
}

export function Pokemon ({ capture, delay = 0, setSelectedPokemon }: Props) {
  const render = useDelayedRender(delay);

  const { username, slug } = useParams<{ username: string; slug: string }>();

  const { setCaptures } = useTrackerContext();
  const { setShowInfo } = useLocalStorageContext();

  const { session } = useSession();
  const user = useUser(username).data!;
  const dex = useMemo<Dex | undefined>(() => keyBy(user.dexes, 'slug')[slug], [user, slug]);

  const createCapturesMutation = useCreateCapture();
  const deleteCapturesMutation = useDeleteCapture();

  if (!render || !capture) {
    return (
      <div className="pokemon empty">
        <div className="set-captured" />
        <div className="set-captured-mobile" />
      </div>
    );
  }

  const handleSetCapturedClick = async () => {
    if (!session || session.id !== user.id) {
      return;
    }

    if (!dex) {
      // This shouldn't really happen, but just in case the dex wasn't loaded in, we don't want a hard crash.
      return;
    }

    if (createCapturesMutation.isLoading || deleteCapturesMutation.isLoading) {
      // We're already making a request, so exit early.
      return;
    }

    createCapturesMutation.reset();
    deleteCapturesMutation.reset();

    const payload = { dex: dex.id, pokemon: [capture.pokemon.id] };

    setCaptures((prev) => prev.map((cap) => {
      if (cap.pokemon.id !== capture.pokemon.id) {
        // We're not modifying this one.
        return cap;
      }
      return {
        ...cap,
        pending: true,
        // We need to make it look like captured is false, otherwise, the pending styles won't show up.
        captured: false,
      };
    }));

    if (capture.captured) {
      await deleteCapturesMutation.mutateAsync({ username: user.username, slug, payload });
      ReactGA.event({ category: 'Pokemon', label: capture.pokemon.name, action: 'unmark' });
    } else {
      await createCapturesMutation.mutateAsync({ username: user.username, slug, payload });
      ReactGA.event({ category: 'Pokemon', label: capture.pokemon.name, action: 'mark' });
    }

    setCaptures((prev) => prev.map((cap) => {
      if (cap.pokemon.id !== capture.pokemon.id) {
        // We're not modifying this one.
        return cap;
      }
      return {
        ...cap,
        pending: false,
        captured: !capture.captured,
      };
    }));
  };

  const handleSetInfoClick = () => {
    ReactGA.event({ action: 'show info', category: 'Pokemon', label: capture.pokemon.name });

    setSelectedPokemon(capture.pokemon.id);
    setShowInfo(true);
  };

  if (!dex) {
    // The dex wasn't fully loaded, so we don't show anything until it loads.
    return null;
  }

  const classes = {
    pokemon: true,
    viewing: !session || session.id !== user.id,
    captured: capture.captured,
    pending: capture.pending,
  };

  const regional = dex.dex_type.tags.includes('regional');
  const idToDisplay = regional ? (capture.pokemon.dex_number === -1 ? '---' : capture.pokemon.dex_number) : nationalId(capture.pokemon.national_id);
  const paddingDigits = dex.total >= 1000 ? 4 : 3;

  return (
    <div className={classNames(classes)}>
      <div className="set-captured" onClick={handleSetCapturedClick}>
        <h4><PokemonName name={capture.pokemon.name} /></h4>
        <div className="icon-wrapper">
          <i className={iconClass(capture.pokemon, dex)} />
        </div>
        <p>#{padding(idToDisplay, paddingDigits)}</p>
      </div>
      <div className="set-captured-mobile" onClick={handleSetCapturedClick}>
        <div className="icon-wrapper">
          <i className={iconClass(capture.pokemon, dex)} />
        </div>
        <h4><PokemonName name={capture.pokemon.name} /></h4>
        <p>#{padding(idToDisplay, paddingDigits)}</p>
      </div>
      <div className="set-info" onClick={handleSetInfoClick}>
        <FontAwesomeIcon icon={faInfo} />
      </div>
    </div>
  );
}
