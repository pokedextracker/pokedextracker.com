import {
  faAsterisk,
  faLongArrowAltRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  useEffect,
  useEffectEvent,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link, useNavigate } from "react-router";

import { useSession } from "../../hooks/contexts/use-session";
import { useLogin } from "../../hooks/queries/sessions";
import { trackEvent } from "../../utils/analytics";
import { Alert } from "../library/Alert";
import { buttonClassName, buttonIcon, buttonLayout } from "../library/Button";
import { Footer } from "../library/Footer";
import {
  form,
  formColumn,
  formControlClassName,
  formGroup,
  formLabel,
  formPage,
  formText,
  formTitle,
  inputIcon,
} from "../library/Form";
import { pageContainer } from "../library/layout";
import { link } from "../library/links";
import { Nav } from "../library/Nav";
import { Reload } from "../library/Reload";

export function Login() {
  const navigate = useNavigate();

  const { session, setToken } = useSession();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useLogin();

  useEffect(() => {
    document.title = "Login | Pokédex Tracker";
  }, []);

  // Someone who's already logged in goes to their profile, but only when they
  // arrive: logging in here navigates on its own.
  const redirectIfLoggedIn = useEffectEvent(() => {
    if (session) {
      navigate(`/u/${session.username}`);
    }
  });
  useEffect(() => {
    redirectIfLoggedIn();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    loginMutation.reset();

    const payload = { username, password };

    try {
      const { token } = await loginMutation.mutateAsync({ payload });
      setToken(token);
      trackEvent("Session", "login");
      navigate(`/u/${username}`);
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
    <div className={pageContainer}>
      <Nav />
      <Reload />
      <div className={formPage}>
        <h1 className={formTitle}>Login</h1>
        <form className={`${form} ${formColumn}`} onSubmit={handleSubmit}>
          <Alert message={loginMutation.error?.message} type="error" />
          <div className={formGroup}>
            <label className={formLabel} htmlFor="username">
              Username
            </label>
            <input
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              className={formControlClassName()}
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
            <FontAwesomeIcon className={inputIcon} icon={faAsterisk} />
          </div>
          <div className={formGroup}>
            <label className={formLabel} htmlFor="password">
              Password
            </label>
            <input
              className={`${formControlClassName()} tracking-2`}
              id="password"
              maxLength={72}
              name="password"
              onChange={handlePasswordChange}
              placeholder="••••••••••••"
              required
              type="password"
              value={password}
            />
            <FontAwesomeIcon className={inputIcon} icon={faAsterisk} />
          </div>
          <button
            className={buttonClassName("blue", `${buttonLayout} mt-40`)}
            disabled={loginMutation.isPending}
            type="submit"
          >
            {"Let's go! "}
            <FontAwesomeIcon
              className={buttonIcon}
              icon={faLongArrowAltRight}
            />
          </button>
          <p className={formText}>
            Don&apos;t have an account yet?{" "}
            <Link className={link} to="/register">
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
