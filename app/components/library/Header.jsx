import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import { faTwitter } from '@fortawesome/free-brands-svg-icons';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { DexIndicator } from './DexIndicator';
import { DonatedFlair } from './DonatedFlair';
import { ReactGA } from '../../utils/analytics';
import { Share } from './Share';

export function Header ({ profile }) {
  const dex = useSelector(({ currentDex, currentUser, users }) => users[currentUser].dexesBySlug[currentDex]);
  const session = useSelector(({ session }) => session);
  const user = useSelector(({ currentUser, users }) => users[currentUser]);

  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    const closeShare = () => setShowShare(false);

    window.addEventListener('click', closeShare);

    return () => window.removeEventListener('click', closeShare);
  }, []);

  const handleShareClick = (e) => {
    e.stopPropagation();

    ReactGA.event({ action: showShare ? 'close' : 'open', category: 'Share' });

    setShowShare((prev) => !prev);
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
            {showShare && <Share profile={profile} />}
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
      {profile && <DonatedFlair user={user} />}
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
