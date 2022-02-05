import PropTypes             from 'prop-types';
import { Link }              from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useSelector }       from 'react-redux';

import { Box }               from './box';
import { DonatedFlair }      from './donated-flair';
import { FriendCode }        from './friend-code';
import { Header }            from './header';
import { Notification }      from './notification';
import { Progress }          from './progress';
import { ReactGA }           from '../utils/analytics';
import { Scroll }            from './scroll';
import { SearchResults }     from './search-results';
import { groupBoxes }        from '../utils/pokemon';
import { SortByButton }      from './sort-by-button';

const DEFER_CUTOFF = 1;

export function Dex ({ onScrollButtonClick }) {
  const dex = useSelector(({ currentDex, currentUser, users }) => users[currentUser].dexesBySlug[currentDex]);
  const query = useSelector(({ query }) => query);
  const username = useSelector(({ currentUser }) => currentUser);
  const [sortByGeneration, setSortByGeneration] = useState(false);

  const caught = useMemo(() => dex.captures.filter(({ captured }) => captured).length, [dex.captures]);
  const total = dex.captures.length;

  const boxes = useMemo(() => groupBoxes(dex.captures, sortByGeneration), [dex.captures, sortByGeneration]);
  const boxs = useMemo(() => {
    return boxes.map((box, i) => (
      <Box
        captures={box}
        deferred={i > DEFER_CUTOFF}
        key={box[0].pokemon.id}
      />
    ));
  }, [boxes, sortByGeneration]);

  return (
    <div className="dex">
      <div className="wrapper">
        <Scroll onClick={onScrollButtonClick} />
        <Notification />
        <header>
          <Header />
          <h3>
            <Link onClick={() => ReactGA.event({ action: 'click view profile', category: 'User' })} to={`/u/${username}`}>/u/{username}</Link>
            <DonatedFlair />
          </h3>
          <FriendCode />
        </header>
        <div className="percentage">
          <Progress caught={caught} total={total} />
        </div>
        <div className="box">
          <div className="box-header">
            <h1>Sort by</h1>
            <SortByButton sortByGeneration={sortByGeneration} setSortByGeneration={setSortByGeneration} />
          </div>
        </div>
        {query.length > 0 ? <SearchResults captures={dex.captures} /> : boxs}
      </div>
    </div>
  );
}

Dex.propTypes = {
  onScrollButtonClick: PropTypes.func.isRequired
};
