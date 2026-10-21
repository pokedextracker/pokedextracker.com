import {
  faAsterisk,
  faChevronDown,
  faLongArrowAltRight,
  faQuestionCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import find from "lodash/find";
import groupBy from "lodash/groupBy";
import keyBy from "lodash/keyBy";
import startCase from "lodash/startCase";
import uniqBy from "lodash/uniqBy";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link, useNavigate } from "react-router";
import slug from "slug";

import { useLocalStorageContext } from "../../hooks/contexts/use-local-storage-context";
import { useSession } from "../../hooks/contexts/use-session";
import { useDexTypes } from "../../hooks/queries/dex-types";
import { useGames } from "../../hooks/queries/games";
import { useCreateUser } from "../../hooks/queries/users";
import type { Customization, DexType, Game } from "../../types";
import { trackEvent } from "../../utils/analytics";
import {
  friendCode3dsFormatter,
  friendCodeSwitchFormatter,
} from "../../utils/formatting";
import { tw } from "../../utils/tw";
import { Alert } from "../library/Alert";
import { buttonClassName, buttonIcon, buttonLayout } from "../library/Button";
import { Footer } from "../library/Footer";
import {
  Checkbox,
  form,
  formColumn,
  formControlClassName,
  formGroup,
  formHeading,
  formLabel,
  formOption,
  formPage,
  formText,
  formTitle,
  inputIcon,
  Radio,
  selectIcon,
} from "../library/Form";
import { pageContainer } from "../library/layout";
import { link } from "../library/links";
import { Nav } from "../library/Nav";
import { Reload } from "../library/Reload";
import { Tooltip } from "../library/Tooltip";

// The account and dex columns, side by side unless the screen is narrow. The
// last field in each has no space under it while they're side by side.
const rowColumn = tw`mx-15 my-0 w-280`;
const rowGroup = tw`${formGroup} last:mb-0 max-600:last:mb-25`;

export function Register() {
  const navigate = useNavigate();

  const { setHideNotification } = useLocalStorageContext();

  const { session, setToken } = useSession();
  const { data: games } = useGames();
  const { data: dexTypes } = useDexTypes();

  const gamesById = useMemo<Record<string, Game>>(
    () => keyBy(games, "id"),
    [games],
  );
  const dexTypesById = useMemo<Record<string, DexType>>(
    () => keyBy(dexTypes, "id"),
    [dexTypes],
  );
  const dexTypesByGameFamilyId = useMemo<Record<string, DexType[]>>(
    () => groupBy(dexTypes, "game_family_id"),
    [dexTypes],
  );
  const customizationDexTypesByBaseDexTypeId = useMemo<
    Record<string, DexType[]>
  >(
    () =>
      groupBy(
        dexTypes?.filter((dt) => dt.base_dex_type_id),
        "base_dex_type_id",
      ),
    [dexTypes],
  );
  const customizationsByBaseDexTypeId = useMemo<
    Record<string, Customization[]>
  >(() => {
    const customizations = dexTypes
      ?.filter((dt) => dt.base_dex_type_id)
      .flatMap<Customization>((dt) =>
        dt.tags
          .filter((tag) => tag.startsWith("customization-"))
          .map((tag) => ({
            label: startCase(tag.replace(/^customization-/, "")),
            value: tag,
            base_dex_type_id: dt.base_dex_type_id!,
          })),
      );
    const uniqueByValueAndBase = uniqBy(
      customizations,
      (customization) =>
        `${customization.value}:${customization.base_dex_type_id}`,
    );
    return groupBy(uniqueByValueAndBase, "base_dex_type_id");
  }, [dexTypes]);

  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [friendCode3ds, setFriendCode3ds] = useState("");
  const [friendCodeSwitch, setFriendCodeSwitch] = useState("");
  const [title, setTitle] = useState("");
  const [game, setGame] = useState(games?.[0].id || "");
  const [dexType, setDexType] = useState(
    dexTypesByGameFamilyId[games?.[0].game_family.id || ""]?.find(
      (dt) => !dt.base_dex_type_id,
    )?.id || -1,
  );
  const [shiny, setShiny] = useState(false);
  const [selectedCustomizations, setSelectedCustomizations] = useState<
    Record<string, boolean>
  >({});

  const resolvedDexType = useMemo<number>(() => {
    if (!customizationDexTypesByBaseDexTypeId[dexType]) {
      // The selected dex type doesn't have any customizations, so just use the base.
      return dexType;
    }

    // Go through all possible customizations and find the dex type that has all the selected customizations while not
    // having any of the non-selected ones. There should only be one.
    const allCustomizations = customizationsByBaseDexTypeId[dexType];
    const matchedDexType = customizationDexTypesByBaseDexTypeId[dexType].find(
      (dt) => {
        return allCustomizations.every((customization) => {
          if (selectedCustomizations[customization.value]) {
            // This customization is selected, so we need to make sure this dex type has this tag.
            return (
              dt.tags.find((tag) => tag === customization.value) !== undefined
            );
          } else {
            // This customization is not selected, so we need to make sure this dex type explicitly does not have this
            // tag.
            return (
              dt.tags.find((tag) => tag === customization.value) === undefined
            );
          }
        });
      },
    );

    if (!matchedDexType) {
      // This shouldn't really happen if we have everything set up properly, but in case it does, use the base instead.
      return dexType;
    }

    return matchedDexType.id;
  }, [
    customizationsByBaseDexTypeId,
    customizationDexTypesByBaseDexTypeId,
    dexType,
    selectedCustomizations,
  ]);

  const createUserMutation = useCreateUser();

  useEffect(() => {
    document.title = "Register | Pokédex Tracker";
  }, []);

  // Someone who's already logged in goes to their profile, but only when they
  // arrive: registering here navigates on its own.
  const redirectIfLoggedIn = useEffectEvent(() => {
    if (session) {
      navigate(`/u/${session.username}`);
    }
  });
  useEffect(() => {
    redirectIfLoggedIn();
  }, []);

  // Once the games and dex types load, the form defaults to the first game
  // and its first dex type. Setting state while rendering applies these before
  // anything shows, rather than drawing an empty form first.
  if (games && !game) {
    setGame(games[0].id);
  }
  if (
    games &&
    Object.keys(dexTypesByGameFamilyId).length > 0 &&
    dexType === -1
  ) {
    setDexType(
      dexTypesByGameFamilyId[games[0].game_family.id].find(
        (dt) => !dt.base_dex_type_id,
      )!.id,
    );
    setSelectedCustomizations({});
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    createUserMutation.reset();
    setError("");

    if (password !== passwordConfirm) {
      setError("passwords need to match");
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
      dex_type: resolvedDexType,
    };

    try {
      const { token } = await createUserMutation.mutateAsync({ payload });
      setToken(token);
      trackEvent("Session", "register");
      setHideNotification(true);
      navigate(`/u/${username}/${payload.slug}`);
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
  const handlePasswordConfirmChange = (e: ChangeEvent<HTMLInputElement>) =>
    setPasswordConfirm(e.target.value);
  const handleFriendCode3dsChange = (e: ChangeEvent<HTMLInputElement>) =>
    setFriendCode3ds(friendCode3dsFormatter(e.target.value));
  const handleFriendCodeSwitchChange = (e: ChangeEvent<HTMLInputElement>) =>
    setFriendCodeSwitch(friendCodeSwitchFormatter(e.target.value));
  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) =>
    setTitle(e.target.value);
  const handleShinyChange = (e: ChangeEvent<HTMLInputElement>) =>
    setShiny(e.target.checked);

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
      const matchingNewDexType = find(dexTypesByGameFamilyId[newGameFamilyId], [
        "name",
        oldDexType.name,
      ]);
      const newDexTypeId =
        matchingNewDexType?.id ||
        dexTypesByGameFamilyId[gamesById[newGameId].game_family.id].find(
          (dt) => !dt.base_dex_type_id,
        )!.id;
      setDexType(newDexTypeId);
      setSelectedCustomizations({});
    }

    setGame(newGameId);
  };

  if (
    !games ||
    !game ||
    dexType === -1 ||
    Object.keys(gamesById).length === 0 ||
    Object.keys(dexTypesByGameFamilyId).length === 0
  ) {
    return null;
  }

  return (
    <div className={pageContainer}>
      <Nav />
      <Reload />
      <div className={formPage}>
        <h1 className={formTitle}>Register</h1>
        <form className={form} onSubmit={handleSubmit}>
          <div className={formColumn}>
            <Alert
              message={error || createUserMutation.error?.message}
              type="error"
            />
          </div>

          <div className="flex max-600:block">
            <div className={rowColumn}>
              <h2 className={formHeading}>Account Info</h2>
              <div className={rowGroup}>
                <label className={formLabel} htmlFor="username">
                  Username
                </label>
                <input
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  className={formControlClassName()}
                  id="username"
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
              <div className={rowGroup}>
                <label className={formLabel} htmlFor="password">
                  Password
                </label>
                <input
                  className={`${formControlClassName()} tracking-2`}
                  id="password"
                  name="password"
                  onChange={handlePasswordChange}
                  placeholder="••••••••••••"
                  required
                  type="password"
                  value={password}
                />
                <FontAwesomeIcon className={inputIcon} icon={faAsterisk} />
              </div>
              <div className={rowGroup}>
                <label className={formLabel} htmlFor="password_confirm">
                  Confirm Password
                </label>
                <input
                  className={`${formControlClassName()} tracking-2`}
                  id="password_confirm"
                  name="password_confirm"
                  onChange={handlePasswordConfirmChange}
                  placeholder="••••••••••••"
                  required
                  type="password"
                  value={passwordConfirm}
                />
                <FontAwesomeIcon className={inputIcon} icon={faAsterisk} />
              </div>
              <div className={rowGroup}>
                <label className={formLabel} htmlFor="friend_code_3ds">
                  3DS Friend Code
                </label>
                <input
                  className={formControlClassName()}
                  id="friend_code_3ds"
                  name="friend_code_3ds"
                  onChange={handleFriendCode3dsChange}
                  placeholder="XXXX-XXXX-XXXX"
                  type="text"
                  value={friendCode3ds}
                />
              </div>
              <div className={rowGroup}>
                <label className={formLabel} htmlFor="friend_code_switch">
                  Switch Friend Code
                </label>
                <input
                  className={formControlClassName()}
                  id="friend_code_switch"
                  name="friend_code_switch"
                  onChange={handleFriendCodeSwitchChange}
                  placeholder="SW-XXXX-XXXX-XXXX"
                  type="text"
                  value={friendCodeSwitch}
                />
              </div>
            </div>

            <div className={rowColumn}>
              <h2 className={formHeading}>
                First Dex Info
                <Tooltip className="bottom-3 ml-7" icon={faQuestionCircle}>
                  You can track multiple dexes on our app! This sets the
                  settings for the first dex on your account.
                </Tooltip>
              </h2>
              <div className={rowGroup}>
                <label className={formLabel} htmlFor="dex_title">
                  Title
                </label>
                <input
                  className={formControlClassName()}
                  id="dex_title"
                  maxLength={300}
                  name="dex_title"
                  onChange={handleTitleChange}
                  placeholder="Living Dex"
                  required
                  type="text"
                  value={title}
                />
                <FontAwesomeIcon className={inputIcon} icon={faAsterisk} />
              </div>
              <div className={rowGroup}>
                <label className={formLabel} htmlFor="game">
                  Game
                </label>
                <select
                  className={formControlClassName()}
                  onChange={handleGameChange}
                  value={game}
                >
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.name}
                    </option>
                  ))}
                </select>
                <FontAwesomeIcon className={selectIcon} icon={faChevronDown} />
              </div>
              <div className={rowGroup}>
                <label className={formLabel} htmlFor="dex-type">
                  Dex Type
                </label>
                {dexTypesByGameFamilyId[gamesById[game].game_family.id]
                  .filter((dt) => !dt.base_dex_type_id)
                  .map((dt) => (
                    <div className={formOption} key={dt.id}>
                      <Radio
                        checked={dexType === dt.id}
                        name="dex-type"
                        onChange={() => {
                          setDexType(dt.id);
                          setSelectedCustomizations({});
                        }}
                      >
                        {dt.name}
                        {dt.description ? (
                          <Tooltip
                            className="ml-5"
                            data-testid="dex-type-info"
                            icon={faQuestionCircle}
                            iconClassName="text-12 text-brand-secondary"
                          >
                            {dt.description}
                          </Tooltip>
                        ) : null}
                      </Radio>
                    </div>
                  ))}
              </div>
              <div className={rowGroup}>
                <label className={formLabel}>Customizations</label>
                <div className={formOption}>
                  <Checkbox
                    checked={shiny}
                    id="customization-shiny"
                    name="customization-shiny"
                    onChange={handleShinyChange}
                  >
                    Shiny
                  </Checkbox>
                </div>
                {customizationsByBaseDexTypeId[dexType]?.map(
                  (customization) => (
                    <div className={formOption} key={customization.value}>
                      <Checkbox
                        checked={
                          selectedCustomizations[customization.value] || false
                        }
                        id={customization.value.replace(/ /g, "-")}
                        name={customization.value.replace(/ /g, "-")}
                        onChange={(e) => {
                          setSelectedCustomizations((prev) => ({
                            ...prev,
                            [customization.value]: e.target.checked,
                          }));
                        }}
                      >
                        {customization.label}
                      </Checkbox>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>

          <div className={formColumn}>
            <button
              className={buttonClassName("blue", `${buttonLayout} mt-40`)}
              disabled={createUserMutation.isPending}
              type="submit"
            >
              {"Let's go! "}
              <FontAwesomeIcon
                className={buttonIcon}
                icon={faLongArrowAltRight}
              />
            </button>
            <p className={formText}>
              Already have an account?{" "}
              <Link className={link} to="/login">
                Login here
              </Link>
              !
            </p>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
