import { Link }    from 'react-router';
import { connect } from 'react-redux';

import { BoxComponent }          from './box';
import { DonatedFlairComponent } from './donated-flair';
import { FriendCodeComponent }   from './friend-code';
import { HeaderComponent }       from './header';
// import { NotificationComponent } from './notification';
import { ProgressComponent }     from './progress';
import { ReactGA }               from '../utils/analytics';
import { ScrollComponent }       from './scroll';
import { groupBoxes }            from '../utils/pokemon';

export function Dex ({ captures, dex, onScrollButtonClick, username }) {
  const caught = captures.filter(({ captured }) => captured).length;
  const total = captures.length;
  const boxes = groupBoxes(captures, dex);

  return (
    <div className="dex">
      <div className="wrapper">
        <ScrollComponent onClick={onScrollButtonClick} />
        {/* <NotificationComponent /> */}
        <header>
          <HeaderComponent />
          <h3>
            <Link to={`/u/${username}`} onClick={() => ReactGA.event({ action: 'click view profile', category: 'User' })}>/u/{username}</Link>
            <DonatedFlairComponent />
          </h3>
          <FriendCodeComponent />
        </header>
        <div className="percentage">
          <ProgressComponent caught={caught} total={total} />
        </div>
        {boxes.map((box) => <BoxComponent key={box[0].pokemon.id} captures={box} />)}
      </div>
    </div>
  );
}

function mapStateToProps ({ currentDex, currentUser, users }) {
  return {
    captures: users[currentUser].dexesBySlug[currentDex].captures,
    dex: users[currentUser].dexesBySlug[currentDex],
    username: currentUser
  };
}

export const DexComponent = connect(mapStateToProps)(Dex);
