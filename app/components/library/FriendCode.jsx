import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { useParams } from 'react-router';

import { ReactGA } from '../../utils/analytics';
import { useSession } from '../../hooks/contexts/use-session';
import { useUser } from '../../hooks/queries/users';

export function FriendCode () {
  const { username } = useParams();

  const user = useUser(username).data;

  const { session } = useSession();

  const ownPage = session && session.id === user.id;

  let editAccountBtn = null;

  if (ownPage) {
    const handleClick = () => ReactGA.event({ action: 'click edit friend code', category: 'User' });

    editAccountBtn = (
      <Link onClick={handleClick} to="/account"><FontAwesomeIcon icon={faPencilAlt} /></Link>
    );
  }

  return (
    <div>
      <h2>
        <b>3DS FC</b>: <span className={user.friend_code_3ds ? '' : 'fc-missing'}>{user.friend_code_3ds || 'XXXX-XXXX-XXXX'}</span> {editAccountBtn}
      </h2>
      <h2>
        <b>Switch FC</b>: <span className={user.friend_code_switch ? '' : 'fc-missing'}>{user.friend_code_switch || 'SW-XXXX-XXXX-XXXX'}</span> {editAccountBtn}
      </h2>
    </div>
  );
}
