import { useEffect } from 'react';

import { Nav } from '../library/Nav';

export function NotFound () {
  useEffect(() => {
    document.title = '404 Not Found | Pokédex Tracker';
  }, []);

  return (
    <div>
      <Nav />
      <div className="not-found">
        <img src="/missingno.svg" />
        <div className="not-found-caption">
          <h1>404 Error<br />Wild MISSINGNO.<br />Appeared!</h1>
          <p>Sorry - looks like the page you were looking for can not be found.</p>
        </div>
      </div>
    </div>
  );
}
