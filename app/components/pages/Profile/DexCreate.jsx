import Modal from 'react-modal';
import PropTypes from 'prop-types';
import find from 'lodash/find';
import slug from 'slug';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAsterisk, faChevronDown, faLongArrowAltRight } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { useRef, useState } from 'react';

import { Alert } from '../../library/Alert';
import { ReactGA } from '../../../utils/analytics';
import { createDex } from '../../../actions/dex';
import { useNightMode } from '../../../hooks/contexts/use-night-mode';
import { useSession } from '../../../hooks/contexts/use-session';

export function DexCreate ({ isOpen, onRequestClose }) {
  const dispatch = useDispatch();

  const history = useHistory();

  const formRef = useRef(null);

  const games = useSelector(({ games }) => games);
  const gamesById = useSelector(({ gamesById }) => gamesById);
  const dexTypesById = useSelector(({ dexTypesById }) => dexTypesById);
  const dexTypesByGameFamilyId = useSelector(({ dexTypesByGameFamilyId }) => dexTypesByGameFamilyId);

  const { isNightMode } = useNightMode();
  const { session } = useSession();

  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [game, setGame] = useState(games[0].id);
  const [dexType, setDexType] = useState(dexTypesByGameFamilyId[games[0].game_family.id][0].id);
  const [shiny, setShiny] = useState(false);

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

    const payload = {
      username: session.username,
      payload: { title, slug: slug(title, { lower: true }), shiny, game, dex_type: dexType },
    };

    setError(null);

    try {
      const dex = await dispatch(createDex(payload));
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
