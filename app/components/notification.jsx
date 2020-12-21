import { FontAwesomeIcon }          from '@fortawesome/react-fontawesome';
import { faTimes }                  from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';

import { setNotification } from '../actions/utils';

export function Notification () {
  const dispatch = useDispatch();

  const notification = useSelector(({ notification }) => notification);

  if (notification) {
    return null;
  }

  const handleClick = () => dispatch(setNotification(true));

  return (
    <div className="alert alert-muted">
      <FontAwesomeIcon icon={faTimes} onClick={handleClick} />
      <p>We've updated for the Crown Tundra! <a href="http://bit.ly/pt-ct" rel="noopener noreferrer" target="_blank">Read more here</a>.</p>
    </div>
  );
}
