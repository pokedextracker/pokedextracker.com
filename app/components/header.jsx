import { Component } from 'react';
import { connect }   from 'react-redux';

import { DexIndicatorComponent } from './dex-indicator';
import { DonatedFlairComponent } from './donated-flair';
import { ReactGA }               from '../utils/analytics';
import { ShareComponent }        from './share';
import { setShowShare }          from '../actions/tracker';

export class Header extends Component {

  componentDidMount () {
    window.addEventListener('click', this.closeShare);
  }

  componentWillUnmount () {
    window.removeEventListener('click', this.closeShare);
  }

  closeShare = () => {
    this.props.setShowShare(false);
  }

  toggleShare = (e, showShare) => {
    e.stopPropagation();

    const { setShowShare } = this.props;

    ReactGA.event({ action: showShare ? 'open' : 'close', category: 'Share' });

    setShowShare(showShare);
  }

  render () {
    const { dex, profile, session, showShare, user } = this.props;
    const ownPage = session && session.id === user.id;

    return (
      <div className="header-row">
        <h1>
          {profile ? `${user.username}'s Profile` : dex.title}
          <div className="share-container">
            <a onClick={(e) => this.toggleShare(e, !showShare)}>
              <i className="fa fa-link" />
              <ShareComponent profile={profile} />
            </a>
            <a href={`http://twitter.com/home/?status=Check out ${ownPage ? 'my' : `${user.username}'s`} ${profile ? 'profile' : 'living dex progress'} on @PokedexTracker! https://pokedextracker.com/u/${user.username}${profile ? '' : `/${dex.slug}`}`} target="_blank" rel="noopener noreferrer" onClick={() => ReactGA.event({ action: 'click tweet', category: 'Share' })}><i className="fa fa-twitter" /></a>
          </div>
        </h1>
        {profile ? <DonatedFlairComponent /> : null}
        <DexIndicatorComponent dex={dex} />
      </div>
    );
  }

}

function mapStateToProps ({ currentDex, currentUser, session, showShare, users }) {
  return { dex: users[currentUser].dexesBySlug[currentDex], session, showShare, user: users[currentUser] };
}

function mapDispatchToProps (dispatch) {
  return {
    setShowShare: (show) => dispatch(setShowShare(show))
  };
}

export const HeaderComponent = connect(mapStateToProps, mapDispatchToProps)(Header);
