import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';
import { faAsterisk, faLongArrowAltRight } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';

import { Alert } from '../library/Alert';
import { Footer } from '../library/Footer';
import { Nav } from '../library/Nav';
import { ReactGA } from '../../utils/analytics';
import { Reload } from '../library/Reload';
import { useLogin } from '../../hooks/queries/sessions';
import { useSession } from '../../hooks/contexts/use-session';

export function Login () {
  const history = useHistory();

  const { session, setToken } = useSession();

  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const loginMutation = useLogin();

  useEffect(() => {
    document.title = 'Login | Pokédex Tracker';
  }, []);

  useEffect(() => {
    if (session) {
      history.push(`/u/${session.username}`);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = { username, password };

    setError(null);

    try {
      const { token } = await loginMutation.mutateAsync({ payload });
      setToken(token);
      ReactGA.event({ action: 'login', category: 'Session' });
      history.push(`/u/${username}`);
    } catch (err) {
      setError(err.message);
      window.scrollTo({ top: 0 });
    }
  };

  const handleUsernameChange = (e) => setUsername(e.target.value);
  const handlePasswordChange = (e) => setPassword(e.target.value);

  return (
    <div className="login-container">
      <Nav />
      <Reload />
      <div className="form">
        <h1>Login</h1>
        <form className="form-column" onSubmit={handleSubmit}>
          <Alert message={error} type="error" />
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              className="form-control"
              id="username"
              maxLength="20"
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
              maxLength="72"
              name="password"
              onChange={handlePasswordChange}
              placeholder="••••••••••••"
              required
              type="password"
              value={password}
            />
            <FontAwesomeIcon icon={faAsterisk} />
          </div>
          <button className="btn btn-blue" type="submit">Let&apos;s go! <FontAwesomeIcon icon={faLongArrowAltRight} /></button>
          <p>Don&apos;t have an account yet? <Link className="link" to="/register">Register here</Link>!</p>
        </form>
      </div>
      <Footer />
    </div>
  );
}
