import PropTypes from 'prop-types';
import { useParams } from 'react-router';
import { useRef } from 'react';
import { useSelector } from 'react-redux';

import { ReactGA } from '../../utils/analytics';

export function Share ({ profile }) {
  const { slug, username } = useParams();

  const inputRef = useRef(null);

  const showShare = useSelector(({ showShare }) => showShare);

  if (!showShare) {
    return null;
  }

  const handleClick = () => {
    ReactGA.event({ action: 'select link', category: 'Share' });
    inputRef.current && inputRef.current.select();
  };

  return (
    <div className="share" onClick={(e) => e.stopPropagation()}>
      Share this {profile ? 'Profile' : 'Living Dex'}:
      <input
        className="form-control"
        onClick={handleClick}
        readOnly
        ref={inputRef}
        value={`https://pokedextracker.com/u/${username}${profile ? '' : `/${slug}`}`}
      />
    </div>
  );
}

Share.propTypes = {
  profile: PropTypes.bool.isRequired,
};
