import { faSearch, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  useEffect,
  useRef,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";

import { trackEvent } from "../../../utils/analytics";
import { Checkbox, formControl } from "../../library/Form";

interface Props {
  hideCaught: boolean;
  query: string;
  setHideCaught: Dispatch<SetStateAction<boolean>>;
  setQuery: Dispatch<SetStateAction<string>>;
}

export function SearchBar({
  hideCaught,
  query,
  setHideCaught,
  setQuery,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyup = (e: KeyboardEvent) => {
      if (
        e.target instanceof Element &&
        e.target.tagName.toLowerCase() !== "input" &&
        e.key === "/"
      ) {
        trackEvent("Search", "used shortcut");
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keyup", handleKeyup);

    return () => document.removeEventListener("keyup", handleKeyup);
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) =>
    setQuery(e.target.value);
  const handleHideCaughtChange = (e: ChangeEvent<HTMLInputElement>) =>
    setHideCaught(e.target.checked);

  const handleClearClick = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="border-b border-gray-light bg-white p-10 night:border-night-mode-dark night:bg-night-mode max-400:pr-35">
      <div className="wrapper">
        <div className="relative mb-0">
          <FontAwesomeIcon
            className="absolute bottom-15 left-14 text-12 text-brand-secondary night:text-white"
            icon={faSearch}
          />
          <input
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className={formControl("h-43 py-0 pr-32 pl-32 text-15")}
            id="search"
            name="search"
            onChange={handleInputChange}
            placeholder="Search by name or # (use / to quick search)"
            ref={inputRef}
            spellCheck="false"
            type="text"
            value={query}
          />
          {query.length > 0 ? (
            <a
              className="group absolute top-0 right-0 flex h-full w-30 cursor-pointer items-center justify-center"
              onClick={handleClearClick}
            >
              <FontAwesomeIcon
                className="static text-10 text-gray-medium group-hover:text-gray-dark"
                icon={faTimes}
              />
            </a>
          ) : null}
        </div>
        <div className="pt-10">
          <div className="relative mb-0">
            <Checkbox
              checked={hideCaught}
              id="hide-caught"
              name="hide-caught"
              onChange={handleHideCaughtChange}
            >
              Hide Caught Pokémon
            </Checkbox>
          </div>
        </div>
      </div>
    </div>
  );
}
