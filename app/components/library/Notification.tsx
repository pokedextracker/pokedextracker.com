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
    <div className="alert alert-muted">
      <FontAwesomeIcon icon={faTimes} onClick={handleClick} />
      <p>
        We&apos;ve <em>finally</em> added support for Pokémon Legends: Z-A and
        the Mega Dimension DLC!{" "}
        <a
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
