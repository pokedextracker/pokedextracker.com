import { FontAwesomeIcon }          from '@fortawesome/react-fontawesome';
import { faLongArrowAltRight }      from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useState }      from 'react';
import { useParams }                from 'react-router';

import { DexCreate }                             from './dex-create';
import { DexPreview }                            from './dex-preview';
import { Footer }                                from './footer';
import { FriendCode }                            from './friend-code';
import { Header }                                from './header';
import { Nav }                                   from './nav';
import { NotFound }                              from './not-found';
import { Notification }                          from './notification';
import { Reload }                                from './reload';
import { checkVersion }                          from '../actions/utils';
import { listGames }                             from '../actions/game';
import { retrieveUser, setCurrentUser, setUser } from '../actions/user';
import { setShowShare }                          from '../actions/tracker';
import { listDexTypes } from '../actions/dex-type';

export function Profile () {
  const dispatch = useDispatch();

  const session = useSelector(({ session }) => session);
  const user = useSelector(({ currentUser, users }) => users[currentUser]);

  const username = (() => {
    console.debug(useParams(), session)
    if (useParams() && useParams().username) {
      return useParams().username
    }
    // In the case where the helper 'me' is used, navigate to authed user.
    return session.username
  })()

  const [isLoading, setIsLoading] = useState(true);
  const [showDexCreate, setShowDexCreate] = useState(false);

  const reload = async () => {
    setIsLoading(true);

    dispatch(checkVersion());
    dispatch(setCurrentUser(username));
    dispatch(setShowShare(false));

    try {
      const [u] = await Promise.all([
        dispatch(retrieveUser(username)),
        dispatch(listGames()),
        dispatch(listDexTypes())
      ]);

      dispatch(setUser(u));

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

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <NotFound />;
  }

  const ownPage = session && session.id === user.id;

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
