import PropTypes from 'prop-types';
import keyBy from 'lodash/keyBy';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import { faTwitter } from '@fortawesome/free-brands-svg-icons';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';

import { DexIndicator } from './DexIndicator';
import { DonatedFlair } from './DonatedFlair';
import { ReactGA } from '../../utils/analytics';
import { Share } from './Share';
import { useSession } from '../../hooks/contexts/use-session';
import { useUser } from '../../hooks/queries/users';

export function Header ({ profile }) {
  const { username, slug } = useParams();

  const user = useUser(username).data;
  const dex = useMemo(() => !profile ? keyBy(user.dexes, 'slug')[slug] : null, [profile, user, slug]);

  const { session } = useSession();

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

  const ownPage = session?.id === user.id;

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
