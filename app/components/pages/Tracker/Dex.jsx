import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { Box } from './Box';
import { DonatedFlair } from '../../library/DonatedFlair';
import { FriendCode } from '../../library/FriendCode';
import { Header } from '../../library/Header';
import { Notification } from '../../library/Notification';
import { Progress } from '../../library/Progress';
import { ReactGA } from '../../../utils/analytics';
import { Scroll } from './Scroll';
import { SearchResults } from './SearchResults';
import { groupBoxes } from '../../../utils/pokemon';

const DEFER_CUTOFF = 1;

export function Dex ({ hideCaught, onScrollButtonClick, query, setHideCaught, setQuery }) {
  const dex = useSelector(({ currentDex, currentUser, users }) => users[currentUser].dexesBySlug[currentDex]);
  const username = useSelector(({ currentUser }) => currentUser);
  const user = useSelector(({ currentUser, users }) => users[currentUser]);

  const caught = useMemo(() => dex.captures.filter(({ captured }) => captured).length, [dex.captures]);
  const total = dex.captures.length;

  const boxes = useMemo(() => groupBoxes(dex.captures), [dex.captures]);
  const boxs = useMemo(() => {
    return boxes.map((box, i) => (
      <Box
        captures={box}
        deferred={i > DEFER_CUTOFF}
        dexTotal={dex.total}
        key={box[0].pokemon.id}
      />
    ));
  }, [boxes]);

  return (
    <div className="dex">
      <div className="wrapper">
        <Scroll onClick={onScrollButtonClick} />
        <Notification />
        <header>
          <Header />
          <h3>
            <Link onClick={() => ReactGA.event({ action: 'click view profile', category: 'User' })} to={`/u/${username}`}>/u/{username}</Link>
            <DonatedFlair user={user} />
          </h3>
          <FriendCode />
        </header>
        <div className="percentage">
          <Progress caught={caught} total={total} />
        </div>
        {query.length > 0 || hideCaught ?
          <SearchResults
            captures={dex.captures}
            hideCaught={hideCaught}
            query={query}
            setHideCaught={setHideCaught}
            setQuery={setQuery}
          /> :
          boxs
        }
      </div>
    </div>
  );
}

Dex.propTypes = {
  hideCaught: PropTypes.bool.isRequired,
  onScrollButtonClick: PropTypes.func.isRequired,
  query: PropTypes.string.isRequired,
  setHideCaught: PropTypes.func.isRequired,
  setQuery: PropTypes.func.isRequired,
};
