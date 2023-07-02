import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle } from '@fortawesome/free-solid-svg-icons';

export function Footer () {
  return (
    <footer className="main-footer">
      <a className="link" href="/">PokédexTracker</a>
      <FontAwesomeIcon icon={faCircle} />
      <a className="link" href="/blog/">Blog</a>
      <FontAwesomeIcon icon={faCircle} />
      <a className="link" href="https://twitter.com/PokedexTracker" rel="noopener noreferrer" target="_blank">Twitter</a>
      <FontAwesomeIcon icon={faCircle} />
      <a className="link" href="https://github.com/pokedextracker" rel="noopener noreferrer" target="_blank">Github</a>
      <FontAwesomeIcon icon={faCircle} />
      <a className="link" href="https://www.patreon.com/pokedextracker" rel="noopener noreferrer" target="_blank">Patreon</a>
    </footer>
  );
}
