import find from 'lodash/find';
import groupBy from 'lodash/groupBy';
import isEmpty from 'lodash/isEmpty';
import slug from 'slug';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';
import { faAsterisk, faChevronDown, faLongArrowAltRight, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';

import { Alert } from './alert';
import { Footer } from './footer';
import { Nav } from './nav';
import { ReactGA } from '../utils/analytics';
import { Reload } from './reload';
import { createUser } from '../actions/user';
import { friendCode3dsFormatter, friendCodeSwitchFormatter } from '../utils/formatting';
import { listGames } from '../actions/game';
import { setNotification } from '../actions/utils';
import { listDexTypes } from '../actions/dex-type';

export function Register () {
  const dispatch = useDispatch();

  const history = useHistory();

  const games = useSelector(({ games }) => games);
  const gamesById = useSelector(({ gamesById }) => gamesById);
  const dexTypesById = useSelector(({ dexTypesById }) => dexTypesById);
  const dexTypesByGameFamilyId = useSelector(({ dexTypesByGameFamilyId }) => dexTypesByGameFamilyId);
  const session = useSelector(({ session }) => session);

  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [friendCode3ds, setFriendCode3ds] = useState('');
  const [friendCodeSwitch, setFriendCodeSwitch] = useState('');
  const [title, setTitle] = useState('');
  const [game, setGame] = useState(!isEmpty(games) && games[0].id);
  const [dexType, setDexType] = useState(!isEmpty(games) && !isEmpty(dexTypesByGameFamilyId) && dexTypesByGameFamilyId[games[0].game_family.id][0].id);
  const [shiny, setShiny] = useState(false);

  useEffect(() => {
    document.title = 'Register | Pokédex Tracker';
  }, []);

  useEffect(() => {
    if (session) {
      history.push(`/u/${session.username}`);
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (!session) {
        const g = await dispatch(listGames());
        const dexTypes = await dispatch(listDexTypes());
        setGame(g[0].id);
        setDexType(groupBy(dexTypes, 'game_family_id')[g[0].game_family.id][0].id);
      }
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      username,
      password,
      password_confirm: passwordConfirm,
      friend_code_3ds: friendCode3ds,
      friend_code_switch: friendCodeSwitch,
      title,
      slug: slug(title, { lower: true }),
      shiny,
      game,
      dex_type: dexType,
    };

    setError(null);

    try {
      await dispatch(createUser(payload));
      ReactGA.event({ action: 'register', category: 'Session' });
      dispatch(setNotification(true));
      history.push(`/u/${username}/${payload.slug}`);
    } catch (err) {
      setError(err.message);
      window.scrollTo({ top: 0 });
    }
  };

  const handleUsernameChange = (e) => setUsername(e.target.value);
  const handlePasswordChange = (e) => setPassword(e.target.value);
  const handlePasswordConfirmChange = (e) => setPasswordConfirm(e.target.value);
  const handleFriendCode3dsChange = (e) => setFriendCode3ds(friendCode3dsFormatter(e.target.value));
  const handleFriendCodeSwitchChange = (e) => setFriendCodeSwitch(friendCodeSwitchFormatter(e.target.value));
  const handleTitleChange = (e) => setTitle(e.target.value);

  const handleGameChange = (e) => {
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

  if (!game) {
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
            <Alert message={error} type="error" />
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
                  maxLength="300"
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
            <button className="btn btn-blue" type="submit">Let&apos;s go! <FontAwesomeIcon icon={faLongArrowAltRight} /></button>
            <p>Already have an account? <Link className="link" to="/login">Login here</Link>!</p>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
