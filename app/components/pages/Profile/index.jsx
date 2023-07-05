import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLongArrowAltRight } from '@fortawesome/free-solid-svg-icons';
import { useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';

import { DexCreate } from './DexCreate';
import { DexPreview } from './DexPreview';
import { Footer } from '../../library/Footer';
import { FriendCode } from '../../library/FriendCode';
import { Header } from '../../library/Header';
import { Nav } from '../../library/Nav';
import { NotFound } from '../NotFound';
import { Notification } from '../../library/Notification';
import { Reload } from '../../library/Reload';
import { listGames } from '../../../actions/game';
import { listDexTypes } from '../../../actions/dex-type';
import { useSession } from '../../../hooks/contexts/use-session';
import { useUser } from '../../../hooks/queries/users';

export function Profile () {
  const dispatch = useDispatch();

  const { username } = useParams();

  const {
    data: user,
    isLoading: userIsLoading,
  } = useUser(username);

  const { session } = useSession();

  const [isLoading, setIsLoading] = useState(true);
  const [showDexCreate, setShowDexCreate] = useState(false);

  const reload = async () => {
    setIsLoading(true);

    try {
      await Promise.all([
        dispatch(listGames()),
        dispatch(listDexTypes()),
      ]);

      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    document.title = `${username}'s Profile | Pokédex Tracker`;
  }, []);

  useEffect(() => {
    reload();
  }, [username]);

  const handleCreateNewDexClick = () => setShowDexCreate(true);
  const handleDexCreateRequestClose = () => setShowDexCreate(false);

  if (isLoading || userIsLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <NotFound />;
  }

  const ownPage = session?.id === user.id;

  return (
    <div className="profile-container">
      <Nav />
      <Reload />
      <div className="profile">
        <div className="wrapper">
          <header>
            <Notification />
            <Header profile />
            <FriendCode />
          </header>

          {user.dexes.map((dex) => <DexPreview dex={dex} key={dex.id} reload={reload} />)}

          {ownPage &&
            <div className="dex-create">
              <div className="btn btn-blue" onClick={handleCreateNewDexClick}>Create a New Dex <FontAwesomeIcon icon={faLongArrowAltRight} /></div>
              <DexCreate isOpen={showDexCreate} onRequestClose={handleDexCreateRequestClose} />
            </div>
          }
        </div>
      </div>
      <Footer />
    </div>
  );
}
