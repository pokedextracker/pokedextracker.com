import { Component } from 'react';
import { connect }   from 'react-redux';

import { ReactGA }   from '../utils/analytics';
import { setRegion } from '../actions/tracker';

const REGIONS = {
  6: ['national', 'kanto', 'johto', 'hoenn', 'sinnoh', 'unova', 'kalos'],
  7: ['national', 'kanto', 'johto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola']
};

export class Region extends Component {

  constructor (props) {
    super(props);
    this.state = { dropdown: false };
  }

  componentDidMount () {
    window.addEventListener('click', this.closeDropdown);
  }

  componentWillUnmount () {
    window.removeEventListener('click', this.closeDropdown);
  }

  closeDropdown = () => {
    this.setState({ dropdown: false });
  }

  setDropdown = (dropdown) => {
    ReactGA.event({ action: dropdown ? 'open' : 'close', category: 'Region' });

    this.setState({ dropdown });
  }

  setRegion = (region) => {
    const { setRegion } = this.props;

    ReactGA.event({ action: 'toggle', category: 'Region', label: region });

    setRegion(region);
    this.setState({ dropdown: false });
  }

  render () {
    const { dex, mobile, region } = this.props;

    if (dex.regional) {
      return null;
    }

    if (mobile) {
      let dropdown = null;

      if (this.state.dropdown) {
        dropdown = (
          <div className="dropdown">
            {REGIONS[dex.game.game_family.generation].map((r) => <div key={r} style={{ display: region === r ? 'none' : 'block' }} onClick={() => this.setRegion(r)}>{r}</div>)}
          </div>
        );
      }

      return (
        <div className="region-filter-mobile" onClick={(e) => e.stopPropagation()}>
          <div className="active" onClick={() => this.setDropdown(!this.state.dropdown)}>
            <span>{region}</span>
            <i className="fa fa-sort-desc" />
          </div>
          {dropdown}
        </div>
      );
    }

    return (
      <div className="region-filter">
        {REGIONS[dex.game.game_family.generation].map((r) => <div key={r} className={region === r ? 'active' : ''} onClick={() => this.setRegion(r)}>{r}</div>)}
      </div>
    );
  }

}

function mapStateToProps ({ currentDex, currentUser, region, users }) {
  return { dex: users[currentUser].dexesBySlug[currentDex], region };
}

function mapDispatchToProps (dispatch) {
  return {
    setRegion: (region) => dispatch(setRegion(region))
  };
}

export const RegionComponent = connect(mapStateToProps, mapDispatchToProps)(Region);
