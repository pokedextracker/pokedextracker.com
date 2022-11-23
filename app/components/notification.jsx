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
      <p>Pokémon Scarlet and Violet support is here! <a href="http://bit.ly/pt-sv-launch" rel="noopener noreferrer" target="_blank">Read more</a>.</p>
    </div>
  );
}
