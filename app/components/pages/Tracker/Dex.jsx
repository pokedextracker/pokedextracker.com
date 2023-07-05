import PropTypes from 'prop-types';
import keyBy from 'lodash/keyBy';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useParams } from 'react-router';

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
import { useCaptures } from '../../../hooks/queries/captures';
import { useUser } from '../../../hooks/queries/users';

const DEFER_CUTOFF = 1;

export function Dex ({ hideCaught, showScrollButton, setSelectedPokemon, onScrollButtonClick, query, setHideCaught, setQuery }) {
  const { username, slug } = useParams();

  const user = useUser(username).data;
  const dex = useMemo(() => keyBy(user.dexes, 'slug')[slug], [user, slug]);
  const captures = useCaptures(username, slug).data;

  const caught = useMemo(() => captures.filter(({ captured }) => captured).length, [captures]);
  const total = captures.length;

  const boxes = useMemo(() => groupBoxes(captures), [captures]);
  const boxs = useMemo(() => {
    return boxes.map((box, i) => (
      <Box
        captures={box}
        deferred={i > DEFER_CUTOFF}
        dexTotal={dex.total}
        key={box[0].pokemon.id}
        setSelectedPokemon={setSelectedPokemon}
      />
    ));
  }, [boxes]);

  return (
    <div className="dex">
      <div className="wrapper">
        <Scroll onClick={onScrollButtonClick} showScroll={showScrollButton} />
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
            captures={captures}
            hideCaught={hideCaught}
            query={query}
            setHideCaught={setHideCaught}
            setQuery={setQuery}
            setSelectedPokemon={setSelectedPokemon}
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
