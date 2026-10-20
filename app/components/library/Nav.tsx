import {
  faCaretDown,
  faCog,
  faMoon,
  faSignOutAlt,
  faSun,
  faTh,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "react-router";

import { useLocalStorageContext } from "../../hooks/contexts/use-local-storage-context";
import { useSession } from "../../hooks/contexts/use-session";
import { trackEvent } from "../../utils/analytics";

export function Nav() {
  const { isNightMode, setIsNightMode } = useLocalStorageContext();
  const { session, sessionUser, sessionUserIsLoading, setToken } = useSession();

  const handleNightModeClick = () => setIsNightMode(!isNightMode);

  const handleSignOutClick = () => {
    trackEvent("Session", "sign out");
    setToken(null);
  };

  // While the signed-in user loads, there's nothing to show beyond the logo.
  if (session && sessionUserIsLoading) {
    return (
      <nav>
        <Link to="/">Pokédex Tracker</Link>
      </nav>
    );
  }

  const links = (
    <>
      <Link to="/">Pokédex Tracker</Link>
      <a
        className="tooltip tooltip-below"
        data-testid="night-mode-toggle"
        onClick={handleNightModeClick}
      >
        <FontAwesomeIcon icon={isNightMode ? faSun : faMoon} />
        <span className="tooltip-text">
          Night Mode {isNightMode ? "Off" : "On"}
        </span>
      </a>
      <a
        href="https://www.patreon.com/pokedextracker"
        rel="noopener noreferrer"
        target="_blank"
      >
        Patreon
      </a>
    </>
  );

  // Signed in. If the user couldn't be loaded, like during a server error,
  // the dropdown still offers the profile, account, and signing out, just
  // without the dexes.
  if (session) {
    return (
      <nav>
        {links}
        <div className="dropdown" data-testid="nav-dropdown">
          <a href="#">
            {session.username} <FontAwesomeIcon icon={faCaretDown} />
          </a>
          <ul data-testid="nav-dropdown-menu">
            <div className="dropdown-scroll">
              {sessionUser?.dexes.map((dex) => (
                <li key={dex.id}>
                  <Link to={`/u/${session.username}/${dex.slug}`}>
                    <FontAwesomeIcon icon={faTh} /> {dex.title}
                  </Link>
                </li>
              ))}
            </div>
            <li>
              <Link to={`/u/${session.username}`}>
                <FontAwesomeIcon icon={faUser} /> Profile
              </Link>
            </li>
            <li>
              <Link to="/account">
                <FontAwesomeIcon icon={faCog} /> Account Settings
              </Link>
            </li>
            <li>
              <a onClick={handleSignOutClick}>
                <FontAwesomeIcon icon={faSignOutAlt} /> Sign Out
              </a>
            </li>
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
