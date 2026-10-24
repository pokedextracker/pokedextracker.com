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
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Modal from "react-modal";
import { useNavigate } from "react-router";
import slug from "slug";

import { useSession } from "../../../hooks/contexts/use-session";
import { useDexTypes } from "../../../hooks/queries/dex-types";
import { useCreateDex } from "../../../hooks/queries/dexes";
import { useGames } from "../../../hooks/queries/games";
import type { Customization, DexType, Game } from "../../../types";
import { trackEvent } from "../../../utils/analytics";
import { Alert } from "../../library/Alert";
import {
  buttonClassName,
  buttonIcon,
  buttonLayout,
} from "../../library/Button";
import {
  Checkbox,
  form,
  formColumn,
  formControlClassName,
  formGroup,
  formLabel,
  formNote,
  formOption,
  formPage,
  formTitle,
  inputIcon,
  Radio,
  selectIcon,
} from "../../library/Form";
import { link } from "../../library/links";
import { modal, modalFooter, modalOverlay } from "../../library/modal";
import { Tooltip } from "../../library/Tooltip";

interface Props {
  onRequestClose: () => void;
}

// DexCreate is only mounted while it's open, so every time it opens, the form
// starts fresh.
export function DexCreate({ onRequestClose }: Props) {
  const navigate = useNavigate();

  const formRef = useRef<HTMLDivElement>(null);
  const { session } = useSession();
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

  const createDexMutation = useCreateDex();

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

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) =>
    setTitle(e.target.value);
  const handleShinyChange = (e: ChangeEvent<HTMLInputElement>) =>
    setShiny(e.target.checked);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    createDexMutation.reset();

    try {
      const dex = await createDexMutation.mutateAsync({
        username: session!.username,
        payload: {
          title,
          slug: slug(title, { lower: true }),
          shiny,
          game,
          dex_type: resolvedDexType,
        },
      });
      trackEvent("Dex", "create");
      navigate(`/u/${session!.username}/${dex.slug}`);
    } catch {
      // Since React Query catches the error and attaches it to the mutation, we don't need to do anything with this
      // error besides prevent it from bubbling up.
      if (formRef.current) {
        formRef.current.scrollTop = 0;
      }
    }
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
    <Modal
      className={modal}
      contentLabel="Create a New Dex"
      isOpen
      onRequestClose={onRequestClose}
      overlayClassName={modalOverlay}
    >
      <div className={formPage} ref={formRef}>
        <h1 className={formTitle}>Create New Dex</h1>
        <form className={`${form} ${formColumn}`} onSubmit={handleSubmit}>
          <Alert message={createDexMutation.error?.message} type="error" />
          <div className={formGroup}>
            <div className={formNote}>
              /u/{session!.username}/
              {slug(title || "Living Dex", { lower: true })}
            </div>
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
          <div className={formGroup}>
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
          <div className={formGroup}>
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
                        icon={faQuestionCircle}
                        iconClassName="text-12 text-blue-600"
                      >
                        {dt.description}
                      </Tooltip>
                    ) : null}
                  </Radio>
                </div>
              ))}
          </div>
          <div className={formGroup}>
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
            {customizationsByBaseDexTypeId[dexType]?.map((customization) => (
              <div className={formOption} key={customization.value}>
                <Checkbox
                  checked={selectedCustomizations[customization.value] || false}
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
            ))}
          </div>
          <button
            className={buttonClassName("blue", `${buttonLayout} mt-40`)}
            disabled={createDexMutation.isPending}
            type="submit"
          >
            {"Create "}
            <FontAwesomeIcon
              className={buttonIcon}
              icon={faLongArrowAltRight}
            />
          </button>
        </form>
      </div>
      <p className={modalFooter}>
        <a className={link} onClick={onRequestClose}>
          Go Back
        </a>
      </p>
    </Modal>
  );
}
