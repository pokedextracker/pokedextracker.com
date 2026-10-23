import { faTwitter } from "@fortawesome/free-brands-svg-icons";
import { faLongArrowAltRight, faRss } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect } from "react";
import { Link } from "react-router";

import { useSession } from "../../hooks/contexts/use-session";
import { tw } from "../../utils/tw";
import { buttonClassName, buttonIcon } from "../library/Button";
import { link } from "../library/links";

// The text under the title, and the headings in the list, which sit closer.
// Both are a little smaller on a narrow phone; the list itself isn't.
const text = tw`mx-0 mt-20 mb-0 max-w-570 px-20 py-0 text-15 font-normal max-400:text-14`;
const item = tw`m-0 max-w-570 p-0 text-15 font-normal max-400:text-14`;

// The buttons under the list, side by side.
const homeButton = tw`mx-8 mt-20 mb-0 inline-block w-180 p-15 text-11 max-400:w-150`;

export function Home() {
  const { session } = useSession();

  useEffect(() => {
    document.title =
      "Pokédex Tracker | Track the Progress of Your Living Dex Completion";
  }, []);

  return (
    <div className="flex flex-[1_1_auto] flex-col bg-brand-primary bg-[url(/pattern.png)] bg-[size:500px_250px] bg-center bg-repeat text-center dark:bg-night-mode dark:bg-[url(/pattern-night.png)]">
      <div className="flex grow flex-col justify-center overflow-y-scroll pt-20">
        <div className="relative -top-100 animate-slide">
          <img
            alt="Gotta catch 'em all!"
            className="mb-10 h-100 w-100 max-400:h-80 max-400:w-80"
            src="/pokeball.svg"
          />
          <h1 className="m-0 font-secondary text-60 font-bold tracking-1 text-heading uppercase no-underline max-400:text-45">
            Pokédex Tracker
          </h1>
        </div>

        <div className="relative top-100 flex animate-slide flex-col items-center">
          <h2 className={text}>
            A tool for tracking your Living Dex progress! We currently support:
          </h2>
          <ul className="mx-0 mt-20 mb-0 inline-block max-w-570 px-20 py-0 text-left text-15 font-normal">
            <li>
              <h2 className={item}>
                <Link
                  className={link}
                  to="/u/ashketchum10/legends-z-a-mega-dimension-full-lumiose-living-dex"
                >
                  Pokémon Legends: Z-A (Mega Dimension) Full Lumiose Dex
                </Link>{" "}
                &amp;{" "}
                <Link
                  className={link}
                  to="/u/ashketchum10/legends-z-a-mega-dimension-hyperspace-living-dex"
                >
                  Hyperspace Dex
                </Link>
              </h2>
            </li>
            <li>
              <h2 className={item}>
                <Link
                  className={link}
                  to="/u/ashketchum10/legends-z-a-lumiose-living-dex"
                >
                  Pokémon Legends: Z-A Lumiose Dex
                </Link>
              </h2>
            </li>
            <li>
              <h2 className={item}>
                <Link
                  className={link}
                  to="/u/ashketchum10/scarlet-expansion-living-dex"
                >
                  Pokémon Scarlet &amp; Violet (Expansion Pass) Full Paldea Dex
                </Link>
                ,{" "}
                <Link
                  className={link}
                  to="/u/ashketchum10/scarlet-kitakami-living-dex"
                >
                  Kitakami Dex
                </Link>
                , &amp;{" "}
                <Link
                  className={link}
                  to="/u/ashketchum10/scarlet-blueberry-living-dex"
                >
                  Blueberry Dex
                </Link>
              </h2>
            </li>
            <li>
              <h2 className={item}>
                <Link
                  className={link}
                  to="/u/ashketchum10/scarlet-regional-living-dex"
                >
                  Pokémon Scarlet &amp; Violet Regional Dex
                </Link>
              </h2>
            </li>
            <li>
              <h2 className={item}>
                <Link
                  className={link}
                  to="/u/ashketchum10/home-national-living-dex"
                >
                  HOME Generation 9 National Dex
                </Link>{" "}
                (and Generations 6, 7, and 8)
              </h2>
            </li>
            <li>
              <h2 className={item}>
                <Link
                  className={link}
                  to="/u/ashketchum10/legends-arceus-regional-living-dex"
                >
                  Pokémon Legends: Arceus Regional Dex
                </Link>
              </h2>
            </li>
            <li>
              <h2 className={item}>
                Pokémon Brilliant Diamond &amp; Shining Pearl{" "}
                <Link
                  className={link}
                  to="/u/ashketchum10/brilliant-diamond-regional-living-dex"
                >
                  Regional Dex
                </Link>{" "}
                and{" "}
                <Link
                  className={link}
                  to="/u/ashketchum10/brilliant-diamond-national-living-dex"
                >
                  National Dex
                </Link>
              </h2>
            </li>
            <li>
              <h2 className={item}>
                <Link
                  className={link}
                  to="/u/ashketchum10/sword-expansion-pass-regional-living-dex"
                >
                  Pokémon Sword &amp; Shield (Expansion Pass) Regional Dex
                </Link>
              </h2>
            </li>
            <li>
              <h2 className={item}>
                <Link
                  className={link}
                  to="/u/ashketchum10/sword-regional-living-dex"
                >
                  Pokémon Sword &amp; Shield Regional Dex
                </Link>
              </h2>
            </li>
            <li>
              <h2 className={item}>
                Previous Games:{" "}
                <Link
                  className={link}
                  to="/u/ashketchum10/lets-go-pikachu-regional-living-dex"
                >
                  Let&apos;s Go, Pikachu &amp; Let&apos;s Go, Eevee
                </Link>
                ,{" "}
                <Link
                  className={link}
                  to="/u/ashketchum10/ultra-sun-regional-living-dex"
                >
                  Ultra Sun &amp; Ultra Moon
                </Link>
                ,{" "}
                <Link
                  className={link}
                  to="/u/ashketchum10/sun-regional-living-dex"
                >
                  Sun &amp; Moon
                </Link>
                ,{" "}
                <Link
                  className={link}
                  to="/u/ashketchum10/omega-ruby-regional-living-dex"
                >
                  Omega Ruby &amp; Alpha Sapphire
                </Link>
                , and{" "}
                <Link
                  className={link}
                  to="/u/ashketchum10/x-regional-living-dex"
                >
                  X &amp; Y
                </Link>
              </h2>
            </li>
            <li>
              <h2 className={item}>
                <Link className={link} to="/u/ashketchum10/shinies">
                  Shiny Dexes
                </Link>{" "}
                for all of the above!
              </h2>
            </li>
          </ul>

          {session ? (
            <div>
              <Link
                className={buttonClassName("blue", homeButton)}
                to={`/u/${session.username}`}
              >
                {"View Profile "}
                <FontAwesomeIcon
                  className={buttonIcon}
                  icon={faLongArrowAltRight}
                />
              </Link>
            </div>
          ) : (
            <div>
              <Link
                className={buttonClassName("blue", homeButton)}
                to="/register"
              >
                {"Register "}
                <FontAwesomeIcon
                  className={buttonIcon}
                  icon={faLongArrowAltRight}
                />
              </Link>
              <Link
                className={buttonClassName("white", homeButton)}
                to="/login"
              >
                {"Login "}
                <FontAwesomeIcon
                  className={buttonIcon}
                  icon={faLongArrowAltRight}
                />
              </Link>
            </div>
          )}

          <h2 className={text}>
            Easily toggle between and track your captured Pokémon, find the
            locations of those left to be captured, manage all your dexes on one{" "}
            <Link className={link} to="/u/ashketchum10">
              profile
            </Link>
            , and share a public link with others to see how you can help each
            other out.
          </h2>

          <p className={text}>
            This project is open source, and you can find the code on{" "}
            <a
              className={link}
              href="https://github.com/pokedextracker"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            . Feel free to report issues, suggest features, or even submit a
            pull request. Help support this project financially by{" "}
            <a
              className={link}
              href="https://www.patreon.com/pokedextracker"
              rel="noopener noreferrer"
              target="_blank"
            >
              donating
            </a>
            &mdash;every little bit helps!
          </p>

          <div className="mx-0 my-20">
            <a
              className={`${link} mx-5 my-0 text-14`}
              href="https://twitter.com/PokedexTracker"
              rel="noopener noreferrer"
              target="_blank"
            >
              <FontAwesomeIcon icon={faTwitter} />
            </a>
            <a
              className={`${link} mx-5 my-0 text-14`}
              href="/blog/"
              rel="noopener noreferrer"
              target="_blank"
            >
              <FontAwesomeIcon icon={faRss} />
            </a>
          </div>
        </div>
      </div>
      <div className="z-1 mt-auto w-full bg-brand-primary-light p-10 font-secondary text-11 font-bold tracking-1 text-brand-secondary uppercase dark:bg-night-mode-dark">
        {"Made with "}
        <i className="pkicon pkicon-ball-love mx-3 my-5 align-middle" /> in San
        Francisco
      </div>
    </div>
  );
}
