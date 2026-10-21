import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { useLocalStorageContext } from "../../hooks/contexts/use-local-storage-context";

export function Notification() {
  const { hideNotification, setHideNotification } = useLocalStorageContext();

  if (hideNotification) {
    return null;
  }

  const handleClick = () => setHideNotification(true);

  return (
    <div className="relative mb-50 border-2 border-solid border-gray-medium p-11 text-center text-14 text-gray-darker dark:border-night-mode-01dp dark:bg-night-mode-01dp dark:text-white">
      <FontAwesomeIcon
        className="absolute top-8 right-8 text-gray-medium transition-all duration-100 ease-out hover:cursor-pointer hover:text-gray-dark"
        icon={faTimes}
        onClick={handleClick}
      />
      <p>
        We&apos;ve <em>finally</em> added support for Pokémon Legends: Z-A and
        the Mega Dimension DLC!{" "}
        <a
          className="text-14 text-gray-darkest hover:text-black dark:text-night-mode-link dark:hover:text-night-mode-link-dark"
          href="https://pokedextracker.com/blog/pokemon-legends-z-a-mega-dimension-dlc/"
          rel="noopener noreferrer"
          target="_blank"
        >
          Read more here
        </a>
        .
      </p>
    </div>
  );
}
