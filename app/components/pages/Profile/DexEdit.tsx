import Modal from 'react-modal';
import find from 'lodash/find';
import groupBy from 'lodash/groupBy';
import keyBy from 'lodash/keyBy';
import slug from 'slug';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAsterisk, faChevronDown, faLongArrowAltRight, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Alert } from '../../library/Alert';
import { FormWarning } from './FormWarning';
import { ReactGA } from '../../../utils/analytics';
import { useDeleteDex, useUpdateDex } from '../../../hooks/queries/dexes';
import { useDexTypes } from '../../../hooks/queries/dex-types';
import { useGames } from '../../../hooks/queries/games';
import { useLocalStorageContext } from '../../../hooks/contexts/use-local-storage-context';
import { useSession } from '../../../hooks/contexts/use-session';

import type { ChangeEvent, MouseEvent, FormEvent } from 'react';
import type { Dex, DexType, Game } from '../../../types';

const GAME_WARNING = 'Any capture info specific to your old game will be lost.';
const REGIONAL_WARNING = 'Any non-regional capture info will be lost.';
const URL_WARNING = 'The old URL to your dex will not function anymore.';

interface Props {
  dex: Dex;
  isOpen: boolean;
  onRequestClose: () => void;
}

export function DexEdit ({ dex, isOpen, onRequestClose }: Props) {
  const formRef = useRef<HTMLDivElement>(null);

  const { isNightMode } = useLocalStorageContext();
  const { session } = useSession();
  const { data: games } = useGames();
  const { data: dexTypes } = useDexTypes();

  const gamesById = useMemo<Record<string, Game>>(() => keyBy(games, 'id'), [games]);
  const dexTypesById = useMemo<Record<string, DexType>>(() => keyBy(dexTypes, 'id'), [dexTypes]);
  const dexTypesByGameFamilyId = useMemo<Record<string, DexType[]>>(() => groupBy(dexTypes, 'game_family_id'), [dexTypes]);

  const [error, setError] = useState('');
  const [title, setTitle] = useState(dex.title);
  const [game, setGame] = useState(dex.game.id);
  const [dexType, setDexType] = useState(dex.dex_type.id);
  const [shiny, setShiny] = useState(dex.shiny);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isConfirmingUpdate, setIsConfirmingUpdate] = useState(false);

  const regional = useMemo(() => dexTypesById[dexType]?.tags.includes('regional'), [dexTypesById, dexType]);

  const updateDexMutation = useUpdateDex();
  const deleteDexMutation = useDeleteDex();

  const reset = () => {
    setError('');
    setTitle(dex.title);
    setGame(dex.game.id);
    setDexType(dex.dex_type.id);
    setShiny(dex.shiny);
    setIsConfirmingDelete(false);
    setIsConfirmingUpdate(false);
  };

  useEffect(() => {
    reset();
  }, [dex]);

  const showGameWarning = useMemo(() => {
    // If you're moving from the expansion down to the original as a regional
    // dex, we should show the game warning. The reason this needed is because
    // we made the national dex for sword_shield the same as the expansion, so
    // the clause checking for national total isn't evaluating to true.
    if (dex.game.game_family.id === 'sword_shield_expansion_pass' && gamesById[game]?.game_family.id === 'sword_shield' && regional) {
      return true;
    }

    const differentFamily = gamesById[game]?.game_family.id !== dex.game.game_family.id;
    const lessNationalCount = gamesById[game]?.game_family.national_total < dex.game.game_family.national_total;

    return differentFamily && lessNationalCount;
  }, [dex.id, game, gamesById, regional]);

  const showRegionalWarning = useMemo(() => regional && !dex.dex_type.tags.includes('regional'), [dex.id, regional]);
  const showUrlWarning = useMemo(() => slug(title || 'Living Dex', { lower: true }) !== dex.slug, [dex.id, title]);

  const handleRequestClose = () => {
    reset();
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
      const newDexTypeId = matchingNewDexType?.id || dexTypesByGameFamilyId[gamesById[newGameId].game_family.id][0].id;
      setDexType(newDexTypeId);
    }

    setGame(newGameId);
  };

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value);

  const handleDeleteClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }

    setError('');

    try {
      await deleteDexMutation.mutateAsync({ username: session!.username, slug: dex.slug });
      ReactGA.event({ action: 'delete', category: 'Dex' });
      handleRequestClose();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
      if (formRef.current) {
        formRef.current.scrollTop = 0;
      }
    }
  };

  const handleUpdateSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isConfirmingUpdate && (showGameWarning || showRegionalWarning || showUrlWarning)) {
      setIsConfirmingUpdate(true);
      return;
    }

    setError('');

    try {
      await updateDexMutation.mutateAsync({
        username: session!.username,
        slug: dex.slug,
        payload: {
          title,
          slug: title !== dex.title ? slug(title, { lower: true }) : undefined,
          shiny,
          game,
          dex_type: dexType,
        },
      });
      ReactGA.event({ action: 'update', category: 'Dex' });
      handleRequestClose();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
      if (formRef.current) {
        formRef.current.scrollTop = 0;
      }
    }
  };

  if (!isOpen || !games || Object.keys(gamesById).length === 0 || Object.keys(dexTypesByGameFamilyId).length === 0) {
    return null;
  }

  return (
    <Modal
      className={`modal ${isNightMode ? 'night-mode' : ''}`}
      contentLabel="Edit Dex"
      isOpen={isOpen}
      onRequestClose={handleRequestClose}
      overlayClassName="modal-overlay"
    >
      <div className="dex-delete-container">
        {isConfirmingDelete ?
          <>
            Are you sure?&nbsp;
            <a className="link" onClick={handleDeleteClick}>Yes</a>&nbsp;
            <a className="link" onClick={() => setIsConfirmingDelete(false)}>No</a>
          </> :
          <a className="link" onClick={handleDeleteClick}>
            <FontAwesomeIcon icon={faTrashAlt} />
          </a>
        }
      </div>
      <div className="form" ref={formRef}>
        <h1>Edit a Dex</h1>
        <form className="form-column" onSubmit={handleUpdateSubmit}>
          <Alert message={error} type="error" />
          <div className="form-group">
            <div className="form-note">/u/{session!.username}/{slug(title || 'Living Dex', { lower: true })}</div>
            <label htmlFor="dex_title">Title</label>
            <FormWarning message={showUrlWarning && URL_WARNING} />
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
            <FontAwesomeIcon icon={faAsterisk} />
          </div>
          <div className="form-group">
            <FormWarning message={showGameWarning && GAME_WARNING} />
            <label htmlFor="game">Game</label>
            <select className="form-control" onChange={handleGameChange} value={game}>
              {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
            </select>
            <FontAwesomeIcon icon={faChevronDown} />
          </div>
          <div className="form-group">
            <FormWarning message={showRegionalWarning && REGIONAL_WARNING} />
            <label htmlFor="dex-type">Dex Type</label>
            {dexTypesByGameFamilyId[gamesById[game].game_family.id].map((dt) => (
              <div className="radio" key={dt.id}>
                <label>
                  <input
                    checked={dexType === dt.id}
                    name="dex-type"
                    onChange={() => setDexType(dt.id)}
                    type="radio"
                  />
                  <span className="radio-custom"><span /></span>{dt.name}
                </label>
              </div>
            ))}
          </div>
          <div className="form-group">
            <label htmlFor="type">Type</label>
            <div className="radio">
              <label>
                <input
                  checked={!shiny}
                  name="type"
                  onChange={() => setShiny(false)}
                  type="radio"
                />
                <span className="radio-custom"><span /></span>Normal
              </label>
            </div>
            <div className="radio">
              <label>
                <input
                  checked={shiny}
                  name="type"
                  onChange={() => setShiny(true)}
                  type="radio"
                />
                <span className="radio-custom"><span /></span>Shiny
              </label>
            </div>
          </div>
          <Alert className="form-confirm" message={isConfirmingUpdate && 'Please review the warnings above and confirm your edit!'} type="error" />
          <button className="btn btn-blue form-confirm" type="submit">{isConfirmingUpdate ? 'Confirm' : ''} Edit <FontAwesomeIcon icon={faLongArrowAltRight} /></button>
        </form>
      </div>
      <p><a className="link" onClick={handleRequestClose}>Go Back</a></p>
    </Modal>
  );
}
