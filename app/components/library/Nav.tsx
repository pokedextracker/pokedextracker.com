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
import { tw } from "../../utils/tw";
import { TooltipText } from "./Tooltip";

const nav = tw`relative flex flex-[0_0_2.625rem] bg-nav font-secondary`;

// What every link in the nav has, the dropdown's included.
const base = tw`p-14 text-11 font-bold tracking-1 text-strong uppercase no-underline transition-all duration-100 ease-out no-touch:hover:cursor-pointer no-touch:hover:text-nav-text-hover no-touch:focus-visible:cursor-pointer max-750:px-10 max-750:text-10`;

// The links along the nav, which light up on hover or keyboard focus on devices
// without touch.
const navLink = tw`${base} flex items-center no-touch:hover:bg-nav-hover no-touch:focus-visible:bg-nav-hover no-touch:focus-visible:text-nav-text-hover`;

// The logo, which pushes the rest of the links to the right.
const logo = tw`${navLink} mr-auto`;

// The username, which opens the dropdown. It lights up while the dropdown is
// hovered, on touch devices too.
const toggle = tw`${base} flex items-center group-hover/dropdown:bg-nav-raised no-touch:focus-visible:bg-nav-raised no-touch:focus-visible:text-nav-text-hover`;

// The dropdown's links.
const item = tw`${base} block truncate border-t-2 border-t-nav bg-nav-raised hover:bg-nav-raised-hover`;
const itemIcon = tw`float-left mt-2 mr-15`;

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
      <nav className={nav}>
        <Link className={logo} to="/">
          Pokédex Tracker
        </Link>
      </nav>
    );
  }

  const links = (
    <>
      <Link className={logo} to="/">
        Pokédex Tracker
      </Link>
      <a
        className={`${navLink} group relative ml-3`}
        data-testid="night-mode-toggle"
        onClick={handleNightModeClick}
      >
        <FontAwesomeIcon
          className="text-11"
          icon={isNightMode ? faSun : faMoon}
        />
        <TooltipText variant="nav">
          Night Mode {isNightMode ? "Off" : "On"}
        </TooltipText>
      </a>
      <a
        className={navLink}
        href="https://www.patreon.com/pokedextracker"
        rel="noopener noreferrer"
        target="_blank"
      >
        Patreon
      </a>
    </>
  );

  // Signed in. If the user couldn't be loaded, like during a server error,
  // the dropdown still offers the profile, account (which then says it
  // couldn't load), and signing out, just without the dexes.
  if (session) {
    return (
      <nav className={nav}>
        {links}
        <div className="group/dropdown flex" data-testid="nav-dropdown">
          <a className={toggle} href="#">
            {session.username}{" "}
            <FontAwesomeIcon className="ml-3" icon={faCaretDown} />
          </a>
          <ul
            className="invisible absolute top-[70%] right-0 z-10 m-0 w-230 list-none p-0 text-right opacity-0 transition-all duration-100 ease-out group-hover/dropdown:visible group-hover/dropdown:top-full group-hover/dropdown:opacity-100"
            data-testid="nav-dropdown-menu"
          >
            <div className="max-h-242 overflow-y-scroll">
              {sessionUser?.dexes.map((dex) => (
                <li key={dex.id}>
                  <Link
                    className={item}
                    to={`/u/${session.username}/${dex.slug}`}
                  >
                    <FontAwesomeIcon className={itemIcon} icon={faTh} />{" "}
                    {dex.title}
                  </Link>
                </li>
              ))}
            </div>
            <li>
              <Link className={item} to={`/u/${session.username}`}>
                <FontAwesomeIcon className={itemIcon} icon={faUser} /> Profile
              </Link>
            </li>
            <li>
              <Link className={item} to="/account">
                <FontAwesomeIcon className={itemIcon} icon={faCog} /> Account
                Settings
              </Link>
            </li>
            <li>
              <a className={item} onClick={handleSignOutClick}>
                <FontAwesomeIcon className={itemIcon} icon={faSignOutAlt} />
                {" Sign Out"}
              </a>
            </li>
          </ul>
        </div>
      </nav>
    );
  }

  return (
    <nav className={nav}>
      {links}
      <Link className={navLink} to="/login">
        Login
      </Link>
      <Link className={navLink} to="/register">
        Register
      </Link>
    </nav>
  );
}
