import find from 'lodash/find';
import groupBy from 'lodash/groupBy';
import keyBy from 'lodash/keyBy';
import slug from 'slug';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';
import { faAsterisk, faChevronDown, faLongArrowAltRight, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router';

import { Alert } from '../library/Alert';
import { Footer } from '../library/Footer';
import { Nav } from '../library/Nav';
import { ReactGA } from '../../utils/analytics';
import { Reload } from '../library/Reload';
import { friendCode3dsFormatter, friendCodeSwitchFormatter } from '../../utils/formatting';
import { useCreateUser } from '../../hooks/queries/users';
import { useDexTypes } from '../../hooks/queries/dex-types';
import { useGames } from '../../hooks/queries/games';
import { useLocalStorageContext } from '../../hooks/contexts/use-local-storage-context';
import { useSession } from '../../hooks/contexts/use-session';

import type { ChangeEvent, FormEvent } from 'react';
import type { DexType, Game } from '../../types';

export function Register () {
  const history = useHistory();

  const { setHideNotification } = useLocalStorageContext();

  const { session, setToken } = useSession();
  const { data: games } = useGames();
  const { data: dexTypes } = useDexTypes();

  const gamesById = useMemo<Record<string, Game>>(() => keyBy(games, 'id'), [games]);
  const dexTypesById = useMemo<Record<string, DexType>>(() => keyBy(dexTypes, 'id'), [dexTypes]);
  const dexTypesByGameFamilyId = useMemo<Record<string, DexType[]>>(() => groupBy(dexTypes, 'game_family_id'), [dexTypes]);

  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [friendCode3ds, setFriendCode3ds] = useState('');
  const [friendCodeSwitch, setFriendCodeSwitch] = useState('');
  const [title, setTitle] = useState('');
  const [game, setGame] = useState(games?.[0].id || '');
  const [dexType, setDexType] = useState(dexTypesByGameFamilyId[games?.[0].game_family.id || '']?.[0].id || -1);
  const [shiny, setShiny] = useState(false);

  const createUserMutation = useCreateUser();

  useEffect(() => {
    document.title = 'Register | Pokédex Tracker';
  }, []);

  useEffect(() => {
    if (session) {
      history.push(`/u/${session.username}`);
    }
  }, []);

  useEffect(() => {
    if (games && !game) {
      setGame(games[0].id);
    }
  }, [games, game]);

  useEffect(() => {
    if (games && Object.keys(dexTypesByGameFamilyId).length > 0 && dexType === -1) {
      setDexType(dexTypesByGameFamilyId[games[0].game_family.id][0].id);
    }
  }, [games, dexTypesByGameFamilyId, dexType]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    createUserMutation.reset();
    setError('');

    if (password !== passwordConfirm) {
      setError('passwords need to match');
      return;
    }

    const payload = {
      username,
      password,
      friend_code_3ds: friendCode3ds,
      friend_code_switch: friendCodeSwitch,
      title,
      slug: slug(title, { lower: true }),
      shiny,
      game,
      dex_type: dexType,
    };

    try {
      const { token } = await createUserMutation.mutateAsync({ payload });
      setToken(token);
      ReactGA.event({ action: 'register', category: 'Session' });
      setHideNotification(true);
      history.push(`/u/${username}/${payload.slug}`);
    } catch (_) {
      // Since React Query catches the error and attaches it to the mutation, we don't need to do anything with this
      // error besides prevent it from bubbling up.
      window.scrollTo({ top: 0 });
    }
  };

  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value);
  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value);
  const handlePasswordConfirmChange = (e: ChangeEvent<HTMLInputElement>) => setPasswordConfirm(e.target.value);
  const handleFriendCode3dsChange = (e: ChangeEvent<HTMLInputElement>) => setFriendCode3ds(friendCode3dsFormatter(e.target.value));
  const handleFriendCodeSwitchChange = (e: ChangeEvent<HTMLInputElement>) => setFriendCodeSwitch(friendCodeSwitchFormatter(e.target.value));
  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value);

  const handleGameChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newGameId = e.target.value;

    // Update the dex type appropriately since every game family has a different
    // set of dex types (even if the names are matching across them). First we
    // check if the game family changed. If it didn't, then we don't need to do
    // anything. If it did, we try to see if there is a matching dex type with
    // the same name, and if there is, use that one. if not, just pick the first
    // available dex type.
    const oldGameFamilyId = gamesById[game].game_family.id;
    const newGameFamilyId = gamesById[newGameId].game_family.id;
    if (oldGameFamilyId !== newGameFamilyId) {
      const oldDexType = dexTypesById[dexType];
      const matchingNewDexType = find(dexTypesByGameFamilyId[newGameFamilyId], ['name', oldDexType.name]);
      const newDexTypeId = matchingNewDexType?.id || dexTypesByGameFamilyId[gamesById[newGameId].game_family.id][0].id;
      setDexType(newDexTypeId);
    }

    setGame(newGameId);
  };

  if (!games || !game || dexType === -1 || Object.keys(gamesById).length === 0 || Object.keys(dexTypesByGameFamilyId).length === 0) {
    return null;
  }

  return (
    <div className="register-container">
      <Nav />
      <Reload />
      <div className="form register">
        <h1>Register</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-column">
            <Alert message={error || createUserMutation.error?.message} type="error" />
          </div>

          <div className="form-row">
            <div className="form-column">
              <h2>Account Info</h2>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  className="form-control"
                  id="username"
                  name="username"
                  onChange={handleUsernameChange}
                  placeholder="ashketchum10"
                  required
                  spellCheck="false"
                  type="text"
                  value={username}
                />
                <FontAwesomeIcon icon={faAsterisk} />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  className="form-control"
                  id="password"
                  name="password"
                  onChange={handlePasswordChange}
                  placeholder="••••••••••••"
                  required
                  type="password"
                  value={password}
                />
                <FontAwesomeIcon icon={faAsterisk} />
              </div>
              <div className="form-group">
                <label htmlFor="password_confirm">Confirm Password</label>
                <input
                  className="form-control"
                  id="password_confirm"
                  name="password_confirm"
                  onChange={handlePasswordConfirmChange}
                  placeholder="••••••••••••"
                  required
                  type="password"
                  value={passwordConfirm}
                />
                <FontAwesomeIcon icon={faAsterisk} />
              </div>
              <div className="form-group">
                <label htmlFor="friend_code_3ds">3DS Friend Code</label>
                <input
                  className="form-control"
                  id="friend_code_3ds"
                  name="friend_code_3ds"
                  onChange={handleFriendCode3dsChange}
                  placeholder="XXXX-XXXX-XXXX"
                  type="text"
                  value={friendCode3ds}
                />
              </div>
              <div className="form-group">
                <label htmlFor="friend_code_switch">Switch Friend Code</label>
                <input
                  className="form-control"
                  id="friend_code_switch"
                  name="friend_code_switch"
                  onChange={handleFriendCodeSwitchChange}
                  placeholder="SW-XXXX-XXXX-XXXX"
                  type="text"
                  value={friendCodeSwitch}
                />
              </div>
            </div>

            <div className="form-column">
              <h2>
                First Dex Info
                <div className="tooltip">
                  <FontAwesomeIcon icon={faQuestionCircle} />
                  <span className="tooltip-text">You can track multiple dexes on our app! This sets the settings for the first dex on your account.</span>
                </div>
              </h2>
              <div className="form-group">
                <label htmlFor="dex_title">Title</label>
                <input
                  className="form-control"
                  id="dex_title"
                  maxLength={300}
                  name="dex_title"
                  onChange={handleTitleChange}
                  placeholder="Living Dex"
                  required
                  type="text"
                  value={title}
                />
                <FontAwesomeIcon icon={faAsterisk} />
              </div>
              <div className="form-group">
                <label htmlFor="game">Game</label>
                <select
                  className="form-control"
                  onChange={handleGameChange}
                  value={game}
                >
                  {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
                </select>
                <FontAwesomeIcon icon={faChevronDown} />
              </div>
              <div className="form-group">
                <label htmlFor="dex-type">Dex Type</label>
                {dexTypesByGameFamilyId[gamesById[game].game_family.id].map((dt) => (
                  <div className="radio" key={dt.id}>
                    <label>
                      <input
                        checked={dexType === dt.id}
                        name="dex-type"
                        onChange={() => setDexType(dt.id)}
                        type="radio"
                      />
                      <span className="radio-custom"><span /></span>{dt.name}
                    </label>
                  </div>
                ))}
              </div>
              <div className="form-group">
                <label htmlFor="type">Type</label>
                <div className="radio">
                  <label>
                    <input
                      checked={!shiny}
                      name="type"
                      onChange={() => setShiny(false)}
                      type="radio"
                    />
                    <span className="radio-custom"><span /></span>Normal
                  </label>
                </div>
                <div className="radio">
                  <label>
                    <input
                      checked={shiny}
                      name="type"
                      onChange={() => setShiny(true)}
                      type="radio"
                    />
                    <span className="radio-custom"><span /></span>Shiny
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="form-column">
            <button className="btn btn-blue" disabled={createUserMutation.isLoading} type="submit">Let&apos;s go! <FontAwesomeIcon icon={faLongArrowAltRight} /></button>
            <p>Already have an account? <Link className="link" to="/login">Login here</Link>!</p>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
