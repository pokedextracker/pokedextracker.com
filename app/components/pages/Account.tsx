import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAsterisk, faChevronDown, faCircleNotch, faLongArrowAltRight } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';

import { Alert } from '../library/Alert';
import { Footer } from '../library/Footer';
import { Nav } from '../library/Nav';
import { ReactGA } from '../../utils/analytics';
import { Reload } from '../library/Reload';
import { friendCode3dsFormatter, friendCodeSwitchFormatter } from '../../utils/formatting';
import { useSession } from '../../hooks/contexts/use-session';
import { useUpdateUser } from '../../hooks/queries/users';

import type { ChangeEvent, FormEvent } from 'react';

export function Account () {
  const history = useHistory();

  const { session, sessionUser, setToken } = useSession();

  const [error, setError] = useState('');
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [friendCode3ds, setFriendCode3ds] = useState(sessionUser?.friend_code_3ds || '');
  const [friendCodeSwitch, setFriendCodeSwitch] = useState(sessionUser?.friend_code_switch || '');

  const updateUserMutation = useUpdateUser();

  useEffect(() => {
    document.title = 'Account | Pokédex Tracker';
  }, []);

  useEffect(() => {
    if (!session) {
      history.push('/login');
    }
  }, [session]);

  useEffect(() => {
    if (sessionUser) {
      setFriendCode3ds(sessionUser.friend_code_3ds || '');
      setFriendCodeSwitch(sessionUser.friend_code_switch || '');
    }
  }, [sessionUser]);

  if (!sessionUser) {
    return null;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    updateUserMutation.reset();
    setError('');

    if (isEditingPassword && password !== passwordConfirm) {
      setError('passwords need to match');
      return;
    }

    try {
      const { token } = await updateUserMutation.mutateAsync({
        username: sessionUser.username,
        payload: {
          password: isEditingPassword ? password : undefined,
          friend_code_3ds: friendCode3ds,
          friend_code_switch: friendCodeSwitch,
        },
      });
      setToken(token);
      ReactGA.event({ action: 'update', category: 'User' });
    } catch (_) {
      // Since React Query catches the error and attaches it to the mutation, we don't need to do anything with this
      // error besides prevent it from bubbling up.
    }

    window.scrollTo({ top: 0 });
  };

  const handleChangePasswordClick = () => setIsEditingPassword((prev) => !prev);
  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value);
  const handlePasswordConfirmChange = (e: ChangeEvent<HTMLInputElement>) => setPasswordConfirm(e.target.value);
  const handleFriendCode3dsChange = (e: ChangeEvent<HTMLInputElement>) => setFriendCode3ds(friendCode3dsFormatter(e.target.value));
  const handleFriendCodeSwitchChange = (e: ChangeEvent<HTMLInputElement>) => setFriendCodeSwitch(friendCodeSwitchFormatter(e.target.value));

  return (
    <div className="account-container">
      <Nav />
      <Reload />
      <div className="form">
        <h1>{sessionUser.username}&apos;s Account</h1>
        <form className="form-column" onSubmit={handleSubmit}>
          <Alert message={error || updateUserMutation.error?.message} type="error" />
          <Alert message={updateUserMutation.isSuccess && 'Account settings saved!'} type="success" />
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
                <FontAwesomeIcon className="input-icon" icon={faAsterisk} />
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
                <FontAwesomeIcon className="input-icon" icon={faAsterisk} />
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
            <FontAwesomeIcon className="input-icon" icon={faChevronDown} />
          </div>
          <button className="btn btn-blue" type="submit">
            {/* The double check for isLoading is necessary because there is a slight delay when applying visibility: hidden onto the icon. */}
            <span className={updateUserMutation.isLoading ? 'hidden' : ''}>Save {!updateUserMutation.isLoading && <FontAwesomeIcon icon={faLongArrowAltRight} />}</span>
            {updateUserMutation.isLoading ? <span className="spinner"><FontAwesomeIcon icon={faCircleNotch} spin /></span> : null}
          </button>
        </form>
      </div>
      <Footer />
    </div>
  );
}
