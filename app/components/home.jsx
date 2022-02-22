import { FontAwesomeIcon }            from '@fortawesome/react-fontawesome';
import { Link }                       from 'react-router-dom';
import { faLongArrowAltRight, faRss } from '@fortawesome/free-solid-svg-icons';
import { faTwitter }                  from '@fortawesome/free-brands-svg-icons';
import { useDispatch, useSelector }   from 'react-redux';
import { useEffect }                  from 'react';

import { checkVersion } from '../actions/utils';

export function Home () {
  const dispatch = useDispatch();

  const session = useSelector(({ session }) => session);

  useEffect(() => {
    document.title = 'Pokédex Tracker | Track the Progress of Your Living Dex Completion';
  }, []);

  dispatch(checkVersion());

  return (
    <div className="home-container">
      <div className="home">
        <div className="hero">
          <img alt="Gotta catch 'em all!" src="/pokeball.svg" />
          <h1>Pokédex Tracker</h1>
        </div>

        <div className="sub">
          <h2>A tool for tracking your Living Dex progress! We currently support:</h2>
          <ul>
            <li><h2><Link alt="Sample Legends: Arceus Regional Living Dex" className="link" to="/u/ashketchum10/legends-arceus-regional-living-dex">Pokémon Legends: Arceus Regional Dex</Link></h2></li>
            <li><h2>Pokémon Brilliant Diamond &amp; Shining Pearl <Link alt="Sample Brilliant Diamond Regional Living Dex" className="link" to="/u/ashketchum10/brilliant-diamond-regional-living-dex">Regional Dex</Link> and <Link alt="Sample Brilliant Diamond National Living Dex" className="link" to="/u/ashketchum10/brilliant-diamond-national-living-dex">National Dex</Link></h2></li>
            <li><h2><Link alt="Sample Generation 8 National Living Dex" className="link" to="/u/ashketchum10/sword-national-living-dex">Generation 8 National Dex</Link> (and Generations 6 + 7)</h2></li>
            <li><h2><Link alt="Sample Shield (Expansion Pass) Regional Living Dex" className="link" to="/u/ashketchum10/sword-expansion-pass-regional-living-dex">Pokémon Sword &amp; Shield (Expansion Pass) Regional Dex</Link></h2></li>
            <li><h2><Link alt="Sample Shield Regional Living Dex" className="link" to="/u/ashketchum10/sword-regional-living-dex">Pokémon Sword &amp; Shield Regional Dex</Link></h2></li>
            <li><h2><Link alt="Sample Let's Go, Pikachu Regional Living Dex" className="link" to="/u/ashketchum10/lets-go-pikachu-regional-living-dex">Pokémon Let's Go, Pikachu &amp; Let's Go, Eevee Regional Dex</Link></h2></li>
            <li><h2><Link alt="Sample Ultra Sun Regional Living Dex" className="link" to="/u/ashketchum10/ultra-sun-regional-living-dex">Pokémon Ultra Sun &amp; Ultra Moon Regional Dex</Link></h2></li>
            <li><h2><Link alt="Sample Sun Regional Living Dex" className="link" to="/u/ashketchum10/sun-regional-living-dex">Pokémon Sun &amp; Moon Regional Dex</Link></h2></li>
            <li><h2><Link alt="Sample Omega Ruby Regional Living Dex" className="link" to="/u/ashketchum10/omega-ruby-regional-living-dex">Pokémon Omega Ruby &amp; Alpha Sapphire Regional Dex</Link></h2></li>
            <li><h2><Link alt="Sample X Regional Living Dex" className="link" to="/u/ashketchum10/x-regional-living-dex">Pokémon X &amp; Y Regional Dex</Link></h2></li>
            <li><h2><Link alt="Sample Shiny Living Dex" className="link" to="/u/ashketchum10/shinies">Shiny Dexes</Link> for all of the above!</h2></li>
          </ul>
          <h2>Easily toggle between and track your captured Pokémon, find the locations of those left to be captured, manage all your dexes on one <Link alt="Sample Profile" className="link" to="/u/ashketchum10">profile</Link>, and share a public link with others to see how you can help each other out.</h2>
          <p>This project is open source, and you can find the code on <a className="link" href="https://github.com/pokedextracker" rel="noopener noreferrer" target="_blank">GitHub</a>. Feel free to report issues, suggest features, or even submit a pull request. Help support this project financially by <a className="link" href="https://www.patreon.com/pokedextracker" rel="noopener noreferrer" target="_blank">donating</a>&mdash;every little bit helps!</p>

          {session ?
            <div>
              <Link className="btn btn-blue" to={`/u/${session.username}`}>View Profile <FontAwesomeIcon icon={faLongArrowAltRight} /></Link>
            </div> :
            <div>
              <Link className="btn btn-blue" to="/register">Register <FontAwesomeIcon icon={faLongArrowAltRight} /></Link>
              <Link className="btn btn-white" to="/login">Login <FontAwesomeIcon icon={faLongArrowAltRight} /></Link>
            </div>
          }

          <div className="social">
            <a className="link" href="https://twitter.com/PokedexTracker" rel="noopener noreferrer" target="_blank"><FontAwesomeIcon icon={faTwitter} /></a>
            <a className="link" href="/blog/" rel="noopener noreferrer" target="_blank"><FontAwesomeIcon icon={faRss} /></a>
          </div>
        </div>
      </div>
      <div className="footer">Made with <i className="pkicon pkicon-ball-love" /> in San Francisco</div>
    </div>
  );
}
