import { Component } from 'react';
import { connect }   from 'react-redux';

import { EvolutionFamilyComponent } from './evolution-family';
import { InfoLocationsComponent }   from './info-locations';
import { ReactGA }                  from '../utils/analytics';
import { htmlName, iconClass }      from '../utils/pokemon';
import { padding }                  from '../utils/formatting';
import { retrievePokemon }          from '../actions/pokemon';
import { setShowInfo }              from '../actions/tracker';

export class Info extends Component {

  componentDidMount () {
    this.reset();
  }

  componentDidUpdate () {
    this.reset();
  }

  reset () {
    const { currentPokemon, dex, pokemon, retrievePokemon } = this.props;

    if (!pokemon) {
      retrievePokemon(currentPokemon, { game_family: dex.game.game_family.id, regional: dex.regional });
    }
  }

  setShowInfo = (showInfo) => {
    const { setShowInfo } = this.props;

    ReactGA.event({ action: showInfo ? 'uncollapse' : 'collapse', category: 'Info' });

    setShowInfo(showInfo);
  }

  render () {
    const { dex, pokemon, showInfo } = this.props;
    const serebiiPath = dex.game.game_family.generation === 6 ? 'pokedex-xy' : 'pokedex-sm';

    if (!pokemon) {
      return (
        <div className={`info ${showInfo ? '' : 'collapsed'}`}>
          <div className="info-collapse" onClick={() => this.setShowInfo(!showInfo)}>
            <i className={`fa ${showInfo ? 'fa-caret-right' : 'fa-caret-left'}`} />
          </div>

          <div className="info-main" />
        </div>
      );
    }

    return (
      <div className={`info ${showInfo ? '' : 'collapsed'}`}>
        <div className="info-collapse" onClick={() => this.setShowInfo(!showInfo)}>
          <i className={`fa ${showInfo ? 'fa-caret-right' : 'fa-caret-left'}`} />
        </div>

        <div className="info-main">
          <div className="info-header">
            <i className={iconClass(pokemon, dex)} />
            <h1 dangerouslySetInnerHTML={htmlName(pokemon.name)} />
            <h2>#{padding(pokemon.national_id, 3)}</h2>
          </div>

          <InfoLocationsComponent gameFamily={dex.game.game_family} pokemon={pokemon} regional={dex.regional} />

          <EvolutionFamilyComponent family={pokemon.evolution_family} />

          <div className="info-footer">
            <a href={`http://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(pokemon.name)}_(Pok%C3%A9mon)`} target="_blank" rel="noopener noreferrer" onClick={() => ReactGA.event({ action: 'open Bulbapedia link', category: 'Info', label: pokemon.name })}>Bulbapedia <i className="fa fa-long-arrow-right" /></a>
            <a href={`http://www.serebii.net/${serebiiPath}/${padding(pokemon.national_id, 3)}.shtml`} target="_blank" rel="noopener noreferrer" onClick={() => ReactGA.event({ action: 'open Serebii link', category: 'Info', label: pokemon.name })}>Serebii <i className="fa fa-long-arrow-right" /></a>
          </div>
        </div>
      </div>
    );
  }

}

function mapStateToProps ({ currentDex, currentUser, currentPokemon, pokemon, showInfo, users }) {
  return { currentPokemon, dex: users[currentUser].dexesBySlug[currentDex], pokemon: pokemon[currentPokemon], showInfo };
}

function mapDispatchToProps (dispatch) {
  return {
    retrievePokemon: (id, query) => dispatch(retrievePokemon(id, query)),
    setShowInfo: (show) => dispatch(setShowInfo(show))
  };
}

export const InfoComponent = connect(mapStateToProps, mapDispatchToProps)(Info);
