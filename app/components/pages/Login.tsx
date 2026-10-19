import {
  faAsterisk,
  faLongArrowAltRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useHistory } from "react-router";
import { Link } from "react-router-dom";

import { useSession } from "../../hooks/contexts/use-session";
import { useLogin } from "../../hooks/queries/sessions";
import { trackEvent } from "../../utils/analytics";
import { Alert } from "../library/Alert";
import { Footer } from "../library/Footer";
import { Nav } from "../library/Nav";
import { Reload } from "../library/Reload";

export function Login() {
  const history = useHistory();

  const { session, setToken } = useSession();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useLogin();

  useEffect(() => {
    document.title = "Login | Pokédex Tracker";
  }, []);

  useEffect(() => {
    if (session) {
      history.push(`/u/${session.username}`);
    }
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    loginMutation.reset();

    const payload = { username, password };

    try {
      const { token } = await loginMutation.mutateAsync({ payload });
      setToken(token);
      trackEvent("Session", "login");
      history.push(`/u/${username}`);
    } catch {
      // Since React Query catches the error and attaches it to the mutation, we don't need to do anything with this
      // error besides prevent it from bubbling up.
      window.scrollTo({ top: 0 });
    }
  };

  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) =>
    setUsername(e.target.value);
  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) =>
    setPassword(e.target.value);

  return (
    <div className="login-container">
      <Nav />
      <Reload />
      <div className="form">
        <h1>Login</h1>
        <form className="form-column" onSubmit={handleSubmit}>
          <Alert message={loginMutation.error?.message} type="error" />
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              className="form-control"
              id="username"
              maxLength={20}
              name="username"
              onChange={handleUsernameChange}
              placeholder="ashketchum10"
              required
              spellCheck="false"
              type="text"
              value={username}
            />
            <FontAwesomeIcon className="input-icon" icon={faAsterisk} />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              className="form-control"
              id="password"
              maxLength={72}
              name="password"
              onChange={handlePasswordChange}
              placeholder="••••••••••••"
              required
              type="password"
              value={password}
            />
            <FontAwesomeIcon className="input-icon" icon={faAsterisk} />
          </div>
          <button
            className="btn btn-blue"
            disabled={loginMutation.isLoading}
            type="submit"
          >
            Let&apos;s go! <FontAwesomeIcon icon={faLongArrowAltRight} />
          </button>
          <p>
            Don&apos;t have an account yet?{" "}
            <Link className="link" to="/register">
              Register here
            </Link>
            !
          </p>
        </form>
      </div>
      <Footer />
    </div>
  );
}
