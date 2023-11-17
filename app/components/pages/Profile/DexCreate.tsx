import Modal from 'react-modal';
import find from 'lodash/find';
import groupBy from 'lodash/groupBy';
import keyBy from 'lodash/keyBy';
import slug from 'slug';
import startCase from 'lodash/startCase';
import uniqBy from 'lodash/uniqBy';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAsterisk, faChevronDown, faLongArrowAltRight, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router';

import { Alert } from '../../library/Alert';
import { ReactGA } from '../../../utils/analytics';
import { useCreateDex } from '../../../hooks/queries/dexes';
import { useDexTypes } from '../../../hooks/queries/dex-types';
import { useGames } from '../../../hooks/queries/games';
import { useLocalStorageContext } from '../../../hooks/contexts/use-local-storage-context';
import { useSession } from '../../../hooks/contexts/use-session';

import type { ChangeEvent, FormEvent } from 'react';
import type { Customization, DexType, Game } from '../../../types';

interface Props {
  isOpen: boolean;
  onRequestClose: () => void;
}

export function DexCreate ({ isOpen, onRequestClose }: Props) {
  const history = useHistory();

  const formRef = useRef<HTMLDivElement>(null);

  const { isNightMode } = useLocalStorageContext();
  const { session } = useSession();
  const { data: games } = useGames();
  const { data: dexTypes } = useDexTypes();

  const gamesById = useMemo<Record<string, Game>>(() => keyBy(games, 'id'), [games]);
  const dexTypesById = useMemo<Record<string, DexType>>(() => keyBy(dexTypes, 'id'), [dexTypes]);
  const dexTypesByGameFamilyId = useMemo<Record<string, DexType[]>>(() => groupBy(dexTypes, 'game_family_id'), [dexTypes]);
  const customizationDexTypesByBaseDexTypeId = useMemo<Record<string, DexType[]>>(() => groupBy(dexTypes?.filter((dt) => dt.base_dex_type_id), 'base_dex_type_id'), [dexTypes]);
  const customizationsByBaseDexTypeId = useMemo<Record<string, Customization[]>>(() => {
    const customizations = dexTypes?.filter((dt) => dt.base_dex_type_id).flatMap<Customization>((dt) => dt.tags.filter((tag) => tag.startsWith('customization-')).map((tag) => ({
      label: startCase(tag.replace(/^customization-/, '')),
      value: tag,
      base_dex_type_id: dt.base_dex_type_id!,
    })));
    const uniqueByValueAndBase = uniqBy(customizations, (customization) => `${customization.value}:${customization.base_dex_type_id}`);
    return groupBy(uniqueByValueAndBase, 'base_dex_type_id');
  }, [dexTypes]);

  const [title, setTitle] = useState('');
  const [game, setGame] = useState(games?.[0].id || '');
  const [dexType, setDexType] = useState(dexTypesByGameFamilyId[games?.[0].game_family.id || '']?.find((dt) => !dt.base_dex_type_id)?.id || -1);
  const [shiny, setShiny] = useState(false);
  const [selectedCustomizations, setSelectedCustomizations] = useState<Record<string, boolean>>({});

  const resolvedDexType = useMemo<number>(() => {
    if (!customizationDexTypesByBaseDexTypeId[dexType]) {
      // The selected dex type doesn't have any customizations, so just use the base.
      return dexType;
    }

    // Go through all possible customizations and find the dex type that has all the selected customizations while not
    // having any of the non-selected ones. There should only be one.
    const allCustomizations = customizationsByBaseDexTypeId[dexType];
    const matchedDexType = customizationDexTypesByBaseDexTypeId[dexType].find((dt) => {
      return allCustomizations.every((customization) => {
        if (selectedCustomizations[customization.value]) {
          // This customization is selected, so we need to make sure this dex type has this tag.
          return dt.tags.find((tag) => tag === customization.value) !== undefined;
        } else {
          // This customization is not selected, so we need to make sure this dex type explicitly does not have this
          // tag.
          return dt.tags.find((tag) => tag === customization.value) === undefined;
        }
      });
    });

    if (!matchedDexType) {
      // This shouldn't really happen if we have everything set up properly, but in case it does, use the base instead.
      return dexType;
    }

    return matchedDexType.id;
  }, [customizationsByBaseDexTypeId, customizationDexTypesByBaseDexTypeId, dexType, selectedCustomizations]);

  const createDexMutation = useCreateDex();

  useEffect(() => {
    if (games && !game) {
      setGame(games[0].id);
    }
  }, [games, game]);

  useEffect(() => {
    if (games && Object.keys(dexTypesByGameFamilyId).length > 0 && dexType === -1) {
      setDexType(dexTypesByGameFamilyId[games[0].game_family.id].find((dt) => !dt.base_dex_type_id)!.id);
      setSelectedCustomizations({});
    }
  }, [games, dexTypesByGameFamilyId, dexType]);

  const handleRequestClose = () => {
    createDexMutation.reset();
    setTitle('');
    setGame(games![0].id || '');
    setDexType(dexTypesByGameFamilyId[games![0].game_family.id].find((dt) => !dt.base_dex_type_id)!.id);
    setShiny(false);
    setSelectedCustomizations({});
    onRequestClose();
  };

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
      const matchingNewDexType = find(dexTypesByGameFamilyId[newGameFamilyId], ['name', oldDexType.name]);
      const newDexTypeId = matchingNewDexType?.id || dexTypesByGameFamilyId[gamesById[newGameId].game_family.id].find((dt) => !dt.base_dex_type_id)!.id;
      setDexType(newDexTypeId);
      setSelectedCustomizations({});
    }

    setGame(newGameId);
  };

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value);
  const handleShinyChange = (e: ChangeEvent<HTMLInputElement>) => setShiny(e.target.checked);

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
      ReactGA.event({ action: 'create', category: 'Dex' });
      history.push(`/u/${session!.username}/${dex.slug}`);
    } catch (_) {
      // Since React Query catches the error and attaches it to the mutation, we don't need to do anything with this
      // error besides prevent it from bubbling up.
      if (formRef.current) {
        formRef.current.scrollTop = 0;
      }
    }
  };

  if (!isOpen || !games || !game || dexType === -1 || Object.keys(gamesById).length === 0 || Object.keys(dexTypesByGameFamilyId).length === 0) {
    return null;
  }

  return (
    <Modal
      className={`modal ${isNightMode ? 'night-mode' : ''}`}
      contentLabel="Create a New Dex"
      isOpen={isOpen}
      onRequestClose={handleRequestClose}
      overlayClassName="modal-overlay"
    >
      <div className="form" ref={formRef}>
        <h1>Create New Dex</h1>
        <form className="form-column" onSubmit={handleSubmit}>
          <Alert message={createDexMutation.error?.message} type="error" />
          <div className="form-group">
            <div className="form-note">/u/{session!.username}/{slug(title || 'Living Dex', { lower: true })}</div>
            <label htmlFor="dex_title">Title</label>
            <input
              className="form-control"
              id="dex_title"
              maxLength={300}
              name="dex_title"
              onChange={handleTitleChange}
              placeholder="Living Dex"
              required
              type="text"
              value={title}
            />
            <FontAwesomeIcon className="input-icon" icon={faAsterisk} />
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
            <FontAwesomeIcon className="input-icon" icon={faChevronDown} />
          </div>
          <div className="form-group">
            <label htmlFor="dex-type">Dex Type</label>
            {dexTypesByGameFamilyId[gamesById[game].game_family.id].filter((dt) => !dt.base_dex_type_id).map((dt) => (
              <div className="form-option" key={dt.id}>
                <div className="radio">
                  <label>
                    <input
                      checked={dexType === dt.id}
                      name="dex-type"
                      onChange={() => {
                        setDexType(dt.id);
                        setSelectedCustomizations({});
                      }}
                      type="radio"
                    />
                    <span className="radio-custom"><span /></span>{dt.name}{dt.description ? (
                      <div className="tooltip">
                        <FontAwesomeIcon className="tooltip-icon" icon={faQuestionCircle} />
                        <span className="tooltip-text">{dt.description}</span>
                      </div>
                    ) : null}
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className="form-group">
            <label>Customizations</label>
            <div className="form-option">
              <div className="checkbox">
                <label>
                  <input
                    checked={shiny}
                    id="customization-shiny"
                    name="customization-shiny"
                    onChange={handleShinyChange}
                    type="checkbox"
                  />
                  <span className="checkbox-custom"><span /></span>Shiny
                </label>
              </div>
            </div>
            {customizationsByBaseDexTypeId[dexType]?.map((customization) => (
              <div className="form-option" key={customization.value}>
                <div className="checkbox">
                  <label>
                    <input
                      checked={selectedCustomizations[customization.value] || false}
                      id={customization.value.replace(/ /g, '-')}
                      name={customization.value.replace(/ /g, '-')}
                      onChange={(e) => {
                        setSelectedCustomizations((prev) => ({
                          ...prev,
                          [customization.value]: e.target.checked,
                        }));
                      }}
                      type="checkbox"
                    />
                    <span className="checkbox-custom"><span /></span>{customization.label}
                  </label>
                </div>
              </div>
            ))}
          </div>
          <button
            className="btn btn-blue"
            disabled={createDexMutation.isLoading}
            type="submit"
          >
            Create <FontAwesomeIcon icon={faLongArrowAltRight} />
          </button>
        </form>
      </div>
      <p><a className="link" onClick={handleRequestClose}>Go Back</a></p>
    </Modal>
  );
}
