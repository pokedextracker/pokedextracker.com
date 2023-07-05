import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { useParams } from 'react-router';
import { useState } from 'react';

import { DexEdit } from './DexEdit';
import { DexIndicator } from '../../library/DexIndicator';
import { Progress } from '../../library/Progress';
import { useSession } from '../../../hooks/contexts/use-session';
import { useUser } from '../../../hooks/queries/users';

export function DexPreview ({ dex }) {
  const { username } = useParams();

  const user = useUser(username).data;

  const { session } = useSession();

  const [showEditDex, setShowEditDex] = useState(false);

  const handleRequestClose = () => {
    setShowEditDex(false);
  };

  const handleEditClick = () => setShowEditDex(true);

  const ownPage = session?.id === user.id;

  return (
    <div className="dex-preview">
      <div className="dex-preview-header">
        <h3><Link className="link" to={`/u/${user.username}/${dex.slug}`}>{dex.title}</Link></h3>
        {ownPage &&
          <div className="dex-edit">
            <a className="link" onClick={handleEditClick}><FontAwesomeIcon icon={faPencilAlt} /></a>
            <DexEdit dex={dex} isOpen={showEditDex} onRequestClose={handleRequestClose} />
          </div>
        }
        <DexIndicator dex={dex} />
      </div>
      <div className="percentage">
        <Progress caught={dex.caught} total={dex.total} />
      </div>
    </div>
  );
}

DexPreview.propTypes = {
  dex: PropTypes.object.isRequired,
};
