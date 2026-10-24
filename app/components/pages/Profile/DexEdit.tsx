import {
  faAsterisk,
  faChevronDown,
  faLongArrowAltRight,
  faQuestionCircle,
  faTrashAlt,
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
  type MouseEvent,
} from "react";
import Modal from "react-modal";
import slug from "slug";

import { useSession } from "../../../hooks/contexts/use-session";
import { useDexTypes } from "../../../hooks/queries/dex-types";
import { useDeleteDex, useUpdateDex } from "../../../hooks/queries/dexes";
import { useGames } from "../../../hooks/queries/games";
import type { Customization, Dex, DexType, Game } from "../../../types";
import { trackEvent } from "../../../utils/analytics";
import { tw } from "../../../utils/tw";
import { Alert } from "../../library/Alert";
import { buttonClassName, buttonIcon } from "../../library/Button";
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
import { FormWarning } from "./FormWarning";

const GAME_WARNING = "Any capture info specific to your old game will be lost.";
const REGIONAL_WARNING = "Any non-regional capture info will be lost.";
const DEX_TYPE_WARNING =
  "Capture info for Pokémon not included in the selected dex type may be lost.";
const URL_WARNING = "The old URL to your dex will not function anymore.";

interface Props {
  dex: Dex;
  onRequestClose: () => void;
}

// The link that deletes the dex, and the one that confirms it, in red.
const deleteLink = tw`mx-3 my-0 cursor-pointer font-medium text-danger underline transition-all duration-100 ease-out hover:text-danger-hover`;

// DexEdit is only mounted while it's open, so every time it opens, the form
// starts from the dex as it is then.
export function DexEdit({ dex, onRequestClose }: Props) {
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

  const [title, setTitle] = useState(dex.title);
  const [game, setGame] = useState(dex.game.id);
  const [dexType, setDexType] = useState(
    dex.dex_type.base_dex_type_id || dex.dex_type.id,
  );
  const [shiny, setShiny] = useState(dex.shiny);
  const [selectedCustomizations, setSelectedCustomizations] = useState<
    Record<string, boolean>
  >(
    dex.dex_type.tags
      .filter((tag) => tag.startsWith("customization-"))
      .reduce(
        (acc, tag) => ({
          ...acc,
          [tag]: true,
        }),
        {},
      ),
  );
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isConfirmingUpdate, setIsConfirmingUpdate] = useState(false);

  const regional = useMemo(
    () => dexTypesById[dexType]?.tags.includes("regional"),
    [dexTypesById, dexType],
  );
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

  const updateDexMutation = useUpdateDex();
  const deleteDexMutation = useDeleteDex();

  const showGameWarning = useMemo(() => {
    // If you're moving from an expansion down to the original as a regional dex, we should show the game warning. The
    // reason this needed is that we made the national dex for sword_shield the same as the expansion, so the clause
    // checking for national total isn't evaluating to true.
    if (
      dex.game.game_family.id.endsWith("_expansion_pass") &&
      dex.game.game_family.id ===
        `${gamesById[game]?.game_family.id}_expansion_pass` &&
      regional
    ) {
      return true;
    }

    const differentFamily =
      gamesById[game]?.game_family.id !== dex.game.game_family.id;
    const lessNationalCount =
      gamesById[game]?.game_family.national_total <
      dex.game.game_family.national_total;

    return differentFamily && lessNationalCount;
  }, [dex, game, gamesById, regional]);

  const showRegionalWarning = useMemo(
    () => regional && !dex.dex_type.tags.includes("regional"),
    [dex, regional],
  );
  // A different family is not necessarily a superset, even when moving to an expansion.
  // Without membership data, warn on any template change unless the game warning already covers it.
  const showDexTypeWarning =
    !showGameWarning && resolvedDexType !== dex.dex_type.id;
  const dexTypeWarning = showRegionalWarning
    ? REGIONAL_WARNING
    : showDexTypeWarning && DEX_TYPE_WARNING;
  const showUrlWarning = useMemo(
    () => slug(title || "Living Dex", { lower: true }) !== dex.slug,
    [dex, title],
  );

  // Changing what the dex will become cancels a confirmation of the old
  // values.
  const cancelConfirmingUpdate = () => setIsConfirmingUpdate(false);

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
        dexTypesByGameFamilyId[gamesById[newGameId].game_family.id][0].id;
      setDexType(newDexTypeId);
      setSelectedCustomizations({});
    }

    setGame(newGameId);
    cancelConfirmingUpdate();
  };

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    cancelConfirmingUpdate();
  };
  const handleShinyChange = (e: ChangeEvent<HTMLInputElement>) =>
    setShiny(e.target.checked);

  const handleDeleteClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    if (updateDexMutation.isPending || deleteDexMutation.isPending) {
      // We're already making a change, so exit early.
      return;
    }

    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }

    updateDexMutation.reset();
    deleteDexMutation.reset();

    try {
      await deleteDexMutation.mutateAsync({
        username: session!.username,
        slug: dex.slug,
      });
      trackEvent("Dex", "delete");
      onRequestClose();
    } catch {
      // Since React Query catches the error and attaches it to the mutation, we don't need to do anything with this
      // error besides prevent it from bubbling up.
      if (formRef.current) {
        formRef.current.scrollTop = 0;
      }
    }
  };

  const handleUpdateSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (
      !isConfirmingUpdate &&
      (showGameWarning || dexTypeWarning || showUrlWarning)
    ) {
      setIsConfirmingUpdate(true);
      return;
    }

    updateDexMutation.reset();
    deleteDexMutation.reset();

    try {
      await updateDexMutation.mutateAsync({
        username: session!.username,
        slug: dex.slug,
        payload: {
          title,
          slug: title !== dex.title ? slug(title, { lower: true }) : undefined,
          shiny,
          game,
          dex_type: resolvedDexType,
        },
      });
      trackEvent("Dex", "update");
      onRequestClose();
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
    Object.keys(gamesById).length === 0 ||
    Object.keys(dexTypesByGameFamilyId).length === 0
  ) {
    return null;
  }

  return (
    <Modal
      className={modal}
      contentLabel="Edit Dex"
      isOpen
      onRequestClose={onRequestClose}
      overlayClassName={modalOverlay}
    >
      <div className="absolute top-10 right-12 z-1 text-right text-14">
        {isConfirmingDelete ? (
          <>
            Are you sure?&nbsp;
            <a className={deleteLink} onClick={handleDeleteClick}>
              Yes
            </a>
            &nbsp;
            <a className={link} onClick={() => setIsConfirmingDelete(false)}>
              No
            </a>
          </>
        ) : (
          <a className={deleteLink} onClick={handleDeleteClick}>
            <FontAwesomeIcon icon={faTrashAlt} />
          </a>
        )}
      </div>
      <div className={formPage} ref={formRef}>
        <h1 className={formTitle}>Edit a Dex</h1>
        <form className={`${form} ${formColumn}`} onSubmit={handleUpdateSubmit}>
          <Alert
            message={
              updateDexMutation.error?.message ||
              deleteDexMutation.error?.message
            }
            type="error"
          />
          <div className={formGroup}>
            <div className={formNote}>
              /u/{session!.username}/
              {slug(title || "Living Dex", { lower: true })}
            </div>
            <label className={formLabel} htmlFor="dex_title">
              Title
            </label>
            <FormWarning message={showUrlWarning && URL_WARNING} />
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
            <FormWarning message={showGameWarning && GAME_WARNING} />
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
            <FormWarning message={dexTypeWarning} />
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
                      cancelConfirmingUpdate();
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
                    cancelConfirmingUpdate();
                  }}
                >
                  {customization.label}
                </Checkbox>
              </div>
            ))}
          </div>
          <Alert
            className="mt-40"
            message={
              isConfirmingUpdate &&
              "Please review the warnings above and confirm your edit!"
            }
            type="error"
          />
          <button
            className={buttonClassName("blue")}
            disabled={
              updateDexMutation.isPending || deleteDexMutation.isPending
            }
            type="submit"
          >
            {isConfirmingUpdate ? "Confirm" : ""} Edit{" "}
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
