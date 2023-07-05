import Modal from 'react-modal';
import PropTypes from 'prop-types';
import find from 'lodash/find';
import groupBy from 'lodash/groupBy';
import keyBy from 'lodash/keyBy';
import slug from 'slug';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAsterisk, faChevronDown, faLongArrowAltRight } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router';

import { Alert } from '../../library/Alert';
import { ReactGA } from '../../../utils/analytics';
import { useCreateDex } from '../../../hooks/queries/dexes';
import { useDexTypes } from '../../../hooks/queries/dex-types';
import { useGames } from '../../../hooks/queries/games';
import { useLocalStorageContext } from '../../../hooks/contexts/use-local-storage-context';
import { useSession } from '../../../hooks/contexts/use-session';

export function DexCreate ({ isOpen, onRequestClose }) {
  const history = useHistory();

  const formRef = useRef(null);

  const { isNightMode } = useLocalStorageContext();
  const { session } = useSession();
  const { data: games } = useGames();
  const { data: dexTypes } = useDexTypes();

  const gamesById = useMemo(() => keyBy(games, 'id'), [games]);
  const dexTypesById = useMemo(() => keyBy(dexTypes, 'id'), [dexTypes]);
  const dexTypesByGameFamilyId = useMemo(() => groupBy(dexTypes, 'game_family_id'), [dexTypes]);

  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [game, setGame] = useState(games?.[0].id);
  const [dexType, setDexType] = useState(dexTypesByGameFamilyId[games?.[0].game_family.id]?.[0].id);
  const [shiny, setShiny] = useState(false);

  const createDexMutation = useCreateDex();

  useEffect(() => {
    if (games && !game) {
      setGame(games[0].id);
    }
  }, [games, game]);

  useEffect(() => {
    if (games && dexTypesByGameFamilyId && !dexType) {
      setDexType(dexTypesByGameFamilyId[games[0].game_family.id][0].id);
    }
  }, [games, dexTypesByGameFamilyId, dexType]);

  const handleRequestClose = () => {
    setError(null);
    setTitle('');
    setGame(games[0].id);
    setDexType(dexTypesByGameFamilyId[games[0].game_family.id][0].id);
    setShiny(false);
    onRequestClose();
  };

  const handleGameChange = (e) => {
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

  const handleTitleChange = (e) => setTitle(e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError(null);

    try {
      const dex = await createDexMutation.mutateAsync({
        username: session.username,
        payload: {
          title,
          slug: slug(title, { lower: true }),
          shiny,
          game,
          dex_type: dexType,
        },
      });
      ReactGA.event({ action: 'create', category: 'Dex' });
      history.push(`/u/${session.username}/${dex.slug}`);
    } catch (err) {
      setError(err.message);
      if (formRef.current) {
        formRef.current.scrollTop = 0;
      }
    }
  };

  if (!isOpen || !games) {
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
          <Alert message={error} type="error" />
          <div className="form-group">
            <div className="form-note">/u/{session.username}/{slug(title || 'Living Dex', { lower: true })}</div>
            <label htmlFor="dex_title">Title</label>
            <input
              className="form-control"
              id="dex_title"
              maxLength="300"
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
            <label htmlFor="game">Game</label>
            <select
              className="form-control"
              onChange={handleGameChange}
              value={game}
            >
              {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
            </select>
            <FontAwesomeIcon icon={faChevronDown} />
          </div>
          <div className="form-group">
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
          <button className="btn btn-blue" type="submit">Create <FontAwesomeIcon icon={faLongArrowAltRight} /></button>
        </form>
      </div>
      <p><a className="link" onClick={handleRequestClose}>Go Back</a></p>
    </Modal>
  );
}

DexCreate.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onRequestClose: PropTypes.func.isRequired,
};
