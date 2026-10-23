import { faCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { tw } from "../../utils/tw";
import { linkColor } from "./links";

const footerLink = tw`${linkColor} font-bold no-underline`;
const separator = tw`mx-10 align-middle text-5 text-gray-medium`;

export function Footer() {
  return (
    <footer className="mt-auto bg-gray-light px-20 py-100 text-center font-secondary text-10 tracking-1 uppercase dark:bg-night-mode-01dp max-750:py-50">
      <a className={footerLink} href="/">
        PokédexTracker
      </a>
      <FontAwesomeIcon className={separator} icon={faCircle} />
      <a className={footerLink} href="/blog/">
        Blog
      </a>
      <FontAwesomeIcon className={separator} icon={faCircle} />
      <a
        className={footerLink}
        href="https://twitter.com/PokedexTracker"
        rel="noopener noreferrer"
        target="_blank"
      >
        Twitter
      </a>
      <FontAwesomeIcon className={separator} icon={faCircle} />
      <a
        className={footerLink}
        href="https://github.com/pokedextracker"
        rel="noopener noreferrer"
        target="_blank"
      >
        Github
      </a>
      <FontAwesomeIcon className={separator} icon={faCircle} />
      <a
        className={footerLink}
        href="https://www.patreon.com/pokedextracker"
        rel="noopener noreferrer"
        target="_blank"
      >
        Patreon
      </a>
    </footer>
  );
}
