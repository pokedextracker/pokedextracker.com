import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

import { useLocalStorageContext } from '../../hooks/contexts/use-local-storage-context';

export function Notification () {
  const { hideNotification, setHideNotification } = useLocalStorageContext();

  if (hideNotification) {
    return null;
  }

  const handleClick = () => setHideNotification(true);

  return (
    <div className="alert alert-muted">
      <FontAwesomeIcon icon={faTimes} onClick={handleClick} />
      <p>Pokémon HOME dexes have been updated for Scarlet and Violet! <a href="http://bit.ly/pt-sv-home" rel="noopener noreferrer" target="_blank">Read more</a>.</p>
    </div>
  );
}
