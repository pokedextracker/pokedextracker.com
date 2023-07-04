import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { faCaretDown, faCog, faMoon, faSignOutAlt, faSun, faTh, faUser } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';

import { ReactGA } from '../../utils/analytics';
import { setToken } from '../../actions/session';
import { useNightMode } from '../../hooks/contexts/use-night-mode';

export function Nav () {
  const dispatch = useDispatch();

  const session = useSelector(({ session }) => session);
  const user = useSelector(({ sessionUser }) => sessionUser);

  const { isNightMode, setIsNightMode } = useNightMode();

  const handleNightModeClick = () => setIsNightMode(!isNightMode);

  const handleSignOutClick = () => {
    ReactGA.event({ action: 'sign out', category: 'Session' });
    dispatch(setToken(null));
  };

  if (session && !user) {
    return (
      <nav>
        <Link to="/">Pokédex Tracker</Link>
      </nav>
    );
  }

  const links = (
    <Fragment>
      <Link to="/">Pokédex Tracker</Link>
      <a className="tooltip tooltip-below" onClick={handleNightModeClick}>
        <FontAwesomeIcon icon={isNightMode ? faSun : faMoon} />
        <span className="tooltip-text">Night Mode {isNightMode ? 'Off' : 'On'}</span>
      </a>
      <a href="https://www.patreon.com/pokedextracker" rel="noopener noreferrer" target="_blank">Patreon</a>
    </Fragment>
  );

  if (session && user) {
    return (
      <nav>
        {links}
        <div className="dropdown">
          <a href="#">{session.username} <FontAwesomeIcon icon={faCaretDown} /></a>
          <ul>
            <div className="dropdown-scroll">
              {user.dexes.map((dex) => <li key={dex.id}><Link to={`/u/${session.username}/${dex.slug}`}><FontAwesomeIcon icon={faTh} /> {dex.title}</Link></li>)}
            </div>
            <li><Link to={`/u/${session.username}`}><FontAwesomeIcon icon={faUser} /> Profile</Link></li>
            <li><Link to="/account"><FontAwesomeIcon icon={faCog} /> Account Settings</Link></li>
            <li><a onClick={handleSignOutClick}><FontAwesomeIcon icon={faSignOutAlt} /> Sign Out</a></li>
          </ul>
        </div>
      </nav>
    );
  }

  return (
    <nav>
      {links}
      <Link to="/login">Login</Link>
      <Link to="/register">Register</Link>
    </nav>
  );
}
