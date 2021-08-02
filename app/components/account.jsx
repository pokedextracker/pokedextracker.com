import { FontAwesomeIcon }                                               from '@fortawesome/react-fontawesome';
import { faAsterisk, faChevronDown, faCircleNotch, faLongArrowAltRight } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector }                                      from 'react-redux';
import { useEffect, useState }                                           from 'react';
import { useHistory }                                                    from 'react-router';

import { Alert }                                             from './alert';
import { Footer }                                            from './footer';
import { Nav }                                               from './nav';
import { ReactGA }                                           from '../utils/analytics';
import { Reload }                                            from './reload';
import { checkVersion }                                      from '../actions/utils';
import { friendCode3dsFormatter, friendCodeSwitchFormatter } from '../utils/formatting';
import { updateUser }                                        from '../actions/user';

export function Account () {
  const dispatch = useDispatch();

  const history = useHistory();

  const session = useSelector(({ session }) => session);
  // If the session user hasn't been loaded yet, temporarily substitute it with
  // the normal session. If there are things that are expected to be in the
  // session user that isn't in the normal session (e.g. dexes), this could
  // cause some problems and might need to be reworked, but right now, it works.
  const user = useSelector(({ session, sessionUser }) => sessionUser || session);

  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [friendCode3ds, setFriendCode3ds] = useState(user && user.friend_code_3ds);
  const [friendCodeSwitch, setFriendCodeSwitch] = useState(user && user.friend_code_switch);
  const [firstPokemonDB, setFirstPokemonDB] = useState(user && user.firstPokemonDB);
  const [secondPokemonDB, setSecondPokemonDB] = useState(user && user.secondPokemonDB);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    document.title = 'Account | Pokédex Tracker';
  }, []);

  useEffect(() => {
    if (!session) {
      history.push('/login');
    }
  }, [session]);

  useEffect(() => {
    dispatch(checkVersion());
  }, []);

  if (!session) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      username: session.username,
      payload: {
        password,
        password_confirm: passwordConfirm,
        friend_code_3ds: friendCode3ds,
        friend_code_switch: friendCodeSwitch,
        first_pokemon_db: firstPokemonDB,
        second_pokemon_db: secondPokemonDB
      }
    };

    setError(null);
    setIsLoading(true);
    setSuccess(null);

    try {
      await dispatch(updateUser(payload));
      ReactGA.event({ action: 'update', category: 'User' });
      setSuccess('Account settings saved!');
    } catch (err) {
      setError(err.message);
    }

    setIsLoading(false);
    window.scrollTo({ top: 0 });
  };

  const handleChangePasswordClick = () => setIsEditingPassword(!isEditingPassword);
  const handlePasswordChange = (e) => setPassword(e.target.value);
  const handlePasswordConfirmChange = (e) => setPasswordConfirm(e.target.value);
  const handleFriendCode3dsChange = (e) => setFriendCode3ds(friendCode3dsFormatter(e.target.value));
  const handleFriendCodeSwitchChange = (e) => setFriendCodeSwitch(friendCodeSwitchFormatter(e.target.value));
  const handleFirstPokemonDBChange = (e) => setFirstPokemonDB(e.target.value);
  const handleSecondPokemonDBChange = (e) => setSecondPokemonDB(e.target.value);

  return (
    <div className="account-container">
      <Nav />
      <Reload />
      <div className="form">
        <h1>{user.username}'s Account</h1>
        <form className="form-column" onSubmit={handleSubmit}>
          <Alert message={error} type="error" />
          <Alert message={success} type="success" />
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <button
              className="btn btn-inline btn-yellow"
              onClick={handleChangePasswordClick}
              type="button"
            >
              {isEditingPassword ? 'Cancel' : 'Change'}
            </button>
          </div>
          {isEditingPassword &&
            <div>
              <div className="form-group">
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
            </div>
          }
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
          <div className="form-group">
            <label htmlFor="language">Pokémon Name Language</label>
            <select className="form-control">
              <option>English</option>
            </select>
            <FontAwesomeIcon icon={faChevronDown} />
          </div>
          <div className="form-group">
            <label htmlFor="first_pokemon_db">First Pokémon Info Link</label>
            <select
              className="form-control"
              id="first_pokemon_db"
              name="first_pokemon_db"
              onChange={handleFirstPokemonDBChange}
              value={firstPokemonDB}>
              <option>Bulbapedia</option>
              <option>Serebii</option>
              <option>PokemonDB</option>
            </select>
            <FontAwesomeIcon icon={faChevronDown} />
          </div>
          <div className="form-group">
            <label htmlFor="second_pokemon_db">Second Pokémon Info Link</label>
            <select
              className="form-control"
              id="second_pokemon_db"
              name="second_pokemon_db"
              onChange={handleSecondPokemonDBChange}
              value={secondPokemonDB}>
              <option>Bulbapedia</option>
              <option>Serebii</option>
              <option>PokemonDB</option>
            </select>
            <FontAwesomeIcon icon={faChevronDown} />
          </div>
          <button className="btn btn-blue" type="submit">
            {/* The double check for isLoading is necessary because there is a slight delay when applying visibility: hidden onto the icon. */}
            <span className={isLoading ? 'hidden' : ''}>Save {!isLoading && <FontAwesomeIcon icon={faLongArrowAltRight} />}</span>
            {isLoading ? <span className="spinner"><FontAwesomeIcon icon={faCircleNotch} spin /></span> : null}
          </button>
        </form>
      </div>
      <Footer />
    </div>
  );
}
