import {
  faAsterisk,
  faChevronDown,
  faCircleNotch,
  faLongArrowAltRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router";

import { useSession } from "../../hooks/contexts/use-session";
import { useUpdateUser } from "../../hooks/queries/users";
import type { User } from "../../types";
import { trackEvent } from "../../utils/analytics";
import {
  friendCode3dsFormatter,
  friendCodeSwitchFormatter,
} from "../../utils/formatting";
import { Alert } from "../library/Alert";
import { Footer } from "../library/Footer";
import { LoadError } from "../library/LoadError";
import { Nav } from "../library/Nav";
import { Reload } from "../library/Reload";

export function Account() {
  const navigate = useNavigate();

  const { session, sessionUser, sessionUserError } = useSession();

  useEffect(() => {
    document.title = "Account | Pokédex Tracker";
  }, []);

  useEffect(() => {
    if (!session) {
      navigate("/login");
    }
  }, [session, navigate]);

  if (!sessionUser) {
    // Still loading, or about to go to the login page. If it couldn't be
    // loaded, say so, with the nav to get somewhere else.
    return sessionUserError ? (
      <LoadError error={sessionUserError} thing="account" />
    ) : null;
  }

  // The form only renders once the user has loaded, so its fields start with
  // the saved values instead of being filled in a moment later, which could
  // land in the middle of someone typing.
  return <AccountForm key={sessionUser.username} sessionUser={sessionUser} />;
}

interface AccountFormProps {
  sessionUser: User;
}

function AccountForm({ sessionUser }: AccountFormProps) {
  const { setToken } = useSession();

  const [error, setError] = useState("");
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [friendCode3ds, setFriendCode3ds] = useState(
    sessionUser.friend_code_3ds || "",
  );
  const [friendCodeSwitch, setFriendCodeSwitch] = useState(
    sessionUser.friend_code_switch || "",
  );

  const updateUserMutation = useUpdateUser();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    updateUserMutation.reset();
    setError("");

    if (isEditingPassword && password !== passwordConfirm) {
      setError("passwords need to match");
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
      trackEvent("User", "update");
    } catch {
      // Since React Query catches the error and attaches it to the mutation, we don't need to do anything with this
      // error besides prevent it from bubbling up.
    }

    window.scrollTo({ top: 0 });
  };

  const handleChangePasswordClick = () => setIsEditingPassword((prev) => !prev);
  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) =>
    setPassword(e.target.value);
  const handlePasswordConfirmChange = (e: ChangeEvent<HTMLInputElement>) =>
    setPasswordConfirm(e.target.value);
  const handleFriendCode3dsChange = (e: ChangeEvent<HTMLInputElement>) =>
    setFriendCode3ds(friendCode3dsFormatter(e.target.value));
  const handleFriendCodeSwitchChange = (e: ChangeEvent<HTMLInputElement>) =>
    setFriendCodeSwitch(friendCodeSwitchFormatter(e.target.value));

  return (
    <div className="account-container">
      <Nav />
      <Reload />
      <div className="form">
        <h1>{sessionUser.username}&apos;s Account</h1>
        <form className="form-column" onSubmit={handleSubmit}>
          <Alert
            message={error || updateUserMutation.error?.message}
            type="error"
          />
          <Alert
            message={updateUserMutation.isSuccess && "Account settings saved!"}
            type="success"
          />
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <button
              className="btn btn-inline btn-yellow"
              onClick={handleChangePasswordClick}
              type="button"
            >
              {isEditingPassword ? "Cancel" : "Change"}
            </button>
          </div>
          {isEditingPassword && (
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
          )}
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
            {/* The double check for isPending is necessary because there is a slight delay when applying visibility: hidden onto the icon. */}
            <span className={updateUserMutation.isPending ? "hidden" : ""}>
              Save{" "}
              {!updateUserMutation.isPending && (
                <FontAwesomeIcon icon={faLongArrowAltRight} />
              )}
            </span>
            {updateUserMutation.isPending ? (
              <span className="spinner">
                <FontAwesomeIcon icon={faCircleNotch} spin />
              </span>
            ) : null}
          </button>
        </form>
      </div>
      <Footer />
    </div>
  );
}
