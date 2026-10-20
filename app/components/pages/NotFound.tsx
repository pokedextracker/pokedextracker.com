import { useEffect } from "react";

import { Nav } from "../library/Nav";

export function NotFound() {
  useEffect(() => {
    document.title = "404 Not Found | Pokédex Tracker";
  }, []);

  return (
    <div>
      <Nav />
      <div className="text-center">
        <img
          alt="Missing No"
          className="relative -top-100 mt-50 h-[35vh] animate-slide"
          src="/missingno.svg"
        />
        <div className="relative top-100 animate-slide">
          <h1 className="mx-0 mt-15 mb-0 font-secondary text-50 font-bold tracking-1 text-brand-secondary uppercase no-underline max-700:text-35">
            404 Error
            <br />
            Wild MISSINGNO.
            <br />
            Appeared!
          </h1>
          <p className="mx-auto mt-25 mb-0 max-w-600 px-15 text-16 font-normal">
            Sorry - looks like the page you were looking for can not be found.
          </p>
        </div>
      </div>
    </div>
  );
}
