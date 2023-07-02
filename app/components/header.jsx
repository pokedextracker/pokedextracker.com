import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import { faTwitter } from '@fortawesome/free-brands-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';

import { DexIndicator } from './dex-indicator';
import { DonatedFlair } from './donated-flair';
import { ReactGA } from '../utils/analytics';
import { Share } from './share';
import { setShowShare } from '../actions/tracker';

export function Header ({ profile }) {
  const dispatch = useDispatch();

  const dex = useSelector(({ currentDex, currentUser, users }) => users[currentUser].dexesBySlug[currentDex]);
  const session = useSelector(({ session }) => session);
  const showShare = useSelector(({ showShare }) => showShare);
  const user = useSelector(({ currentUser, users }) => users[currentUser]);

  useEffect(() => {
    const closeShare = () => dispatch(setShowShare(false));

    window.addEventListener('click', closeShare);

    return () => window.removeEventListener('click', closeShare);
  }, []);

  const handleShareClick = (e) => {
    e.stopPropagation();

    ReactGA.event({ action: showShare ? 'close' : 'open', category: 'Share' });

    dispatch(setShowShare(!showShare));
  };

  const handleTweetClick = () => ReactGA.event({ action: 'click tweet', category: 'Share' });

  const ownPage = session && session.id === user.id;

  return (
    <div className="header-row">
      <h1>
        {profile ? `${user.username}'s Profile` : dex.title}
        <div className="share-container">
          <a onClick={handleShareClick}>
            <FontAwesomeIcon icon={faLink} />
            <Share profile={profile} />
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=Check out ${ownPage ? 'my' : `${user.username}'s`} ${profile ? 'profile' : 'living dex progress'} on @PokedexTracker! https://pokedextracker.com/u/${user.username}${profile ? '' : `/${dex.slug}`}`}
            onClick={handleTweetClick}
            rel="noopener noreferrer"
            target="_blank"
          >
            <FontAwesomeIcon icon={faTwitter} />
          </a>
        </div>
      </h1>
      {profile && <DonatedFlair />}
      {!profile && <DexIndicator dex={dex} />}
    </div>
  );
}

Header.defaultProps = {
  profile: false,
};

Header.propTypes = {
  profile: PropTypes.bool,
};
