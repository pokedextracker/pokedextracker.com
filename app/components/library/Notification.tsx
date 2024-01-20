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
      <p>We've updated for The Indigo Disk! <a href="http://bit.ly/pt-indigo-disk" rel="noopener noreferrer" target="_blank">Read more here</a>.</p>
    </div>
  );
}
