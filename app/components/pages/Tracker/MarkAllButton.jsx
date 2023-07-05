import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';

import { ReactGA } from '../../../utils/analytics';
import { createCaptures, deleteCaptures } from '../../../actions/capture';
import { padding } from '../../../utils/formatting';
import { useSession } from '../../../hooks/contexts/use-session';

export function MarkAllButton ({ captures }) {
  const dispatch = useDispatch();

  const currentDex = useSelector(({ currentDex }) => currentDex);
  const dex = useSelector(({ currentDex, currentUser, users }) => users[currentUser].dexesBySlug[currentDex]);
  const user = useSelector(({ currentUser, users }) => users[currentUser]);

  const { session } = useSession();

  const [isLoading, setIsLoading] = useState(false);

  const uncaught = useMemo(() => {
    return captures.reduce((total, capture) => total + (capture.captured ? 0 : 1), 0);
  }, [captures]);

  const ownPage = session?.id === user.id;

  if (!ownPage) {
    return null;
  }

  const handleButtonClick = async () => {
    const deleting = uncaught === 0;
    const pokemon = captures
    .filter((capture) => capture.captured === deleting)
    .map((capture) => capture.pokemon.id);
    const payload = { dex: dex.id, pokemon };

    setIsLoading(true);

    if (deleting) {
      await dispatch(deleteCaptures({ payload, slug: currentDex, username: user.username }));
    } else {
      await dispatch(createCaptures({ payload, slug: currentDex, username: user.username }));
    }

    ReactGA.event({
      category: 'Box',
      label: `${padding(captures[0].pokemon.national_id, 3)} - ${padding(captures[captures.length - 1].pokemon.national_id, 3)}`,
      action: deleting ? 'unmark all' : 'mark all',
    });

    setIsLoading(false);
  };

  return (
    <button className="btn btn-blue" disabled={isLoading} onClick={handleButtonClick}>
      <span className={isLoading ? 'hidden' : ''}>{uncaught === 0 ? 'Unmark' : 'Mark'} All</span>
      {isLoading ?
        <span className="spinner">
          <FontAwesomeIcon icon={faCircleNotch} spin />
        </span> :
        null
      }
    </button>
  );
}

MarkAllButton.propTypes = {
  captures: PropTypes.arrayOf(PropTypes.object).isRequired,
};
