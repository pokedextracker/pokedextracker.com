import PropTypes from 'prop-types';
import classNames from 'classnames';
import keyBy from 'lodash/keyBy';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfo } from '@fortawesome/free-solid-svg-icons';
import { useDispatch } from 'react-redux';
import { useMemo } from 'react';
import { useParams } from 'react-router';

import { PokemonName } from '../../library/PokemonName';
import { ReactGA } from '../../../utils/analytics';
import { createCaptures, deleteCaptures } from '../../../actions/capture';
import { iconClass } from '../../../utils/pokemon';
import { nationalId, padding } from '../../../utils/formatting';
import { useDelayedRender } from '../../../hooks/use-delayed-render';
import { useLocalStorageContext } from '../../../hooks/contexts/use-local-storage-context';
import { useSession } from '../../../hooks/contexts/use-session';
import { useUser } from '../../../hooks/queries/users';

export function Pokemon ({ capture, delay, setSelectedPokemon }) {
  const render = useDelayedRender(delay);

  const { username, slug } = useParams();

  const user = useUser(username).data;
  const dex = useMemo(() => keyBy(user.dexes, 'slug')[slug], [user, slug]);

  const { setShowInfo } = useLocalStorageContext();

  const dispatch = useDispatch();

  const { session } = useSession();

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

    const payload = { dex: dex.id, pokemon: [capture.pokemon.id] };

    if (capture.captured) {
      await dispatch(deleteCaptures({ payload, slug, username: user.username }));
      ReactGA.event({ category: 'Pokemon', label: capture.pokemon.name, action: 'unmark' });
    } else {
      await dispatch(createCaptures({ payload, slug, username: user.username }));
      ReactGA.event({ category: 'Pokemon', label: capture.pokemon.name, action: 'mark' });
    }
  };

  const handleSetInfoClick = () => {
    ReactGA.event({ action: 'show info', category: 'Pokemon', label: capture.pokemon.name });

    setSelectedPokemon(capture.pokemon.id);
    setShowInfo(true);
  };

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

Pokemon.defaultProps = {
  delay: 0,
};

Pokemon.propTypes = {
  capture: PropTypes.object,
  delay: PropTypes.number,
};
