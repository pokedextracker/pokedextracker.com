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
      <p>Scarlet and Violet Expansion Pass (The Teal Mask) Support is Here! <a href="http://bit.ly/pt-teal-mask" rel="noopener noreferrer" target="_blank">Read more</a>.</p>
    </div>
  );
}
