import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { useSelector } from 'react-redux';
import { useState } from 'react';

import { DexEdit } from './dex-edit';
import { DexIndicator } from './dex-indicator';
import { Progress } from './progress';

export function DexPreview ({ dex, reload }) {
  const session = useSelector(({ session }) => session);
  const user = useSelector(({ currentUser, users }) => users[currentUser]);

  const [showEditDex, setShowEditDex] = useState(false);

  const handleRequestClose = (shouldReload) => {
    setShowEditDex(false);

    if (shouldReload) {
      reload();
    }
  };

  const handleEditClick = () => setShowEditDex(true);

  const ownPage = session && session.id === user.id;

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
  reload: PropTypes.func.isRequired,
};
