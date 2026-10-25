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
import { Checkbox, fieldSize, formControlClassName } from "../../library/Form";
import { wrapper } from "../../library/layout";

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
    <div className="border-b border-gray-100 bg-surface p-10 dark:border-black print:hidden max-400:pr-35">
      <div className={wrapper}>
        <div className="relative">
          <FontAwesomeIcon
            className="absolute bottom-15 left-14 text-12 text-strong"
            icon={faSearch}
          />
          <input
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className={formControlClassName(`${fieldSize} pl-32`)}
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
                className="static text-10 text-gray-300 group-hover:text-gray-400"
                icon={faTimes}
              />
            </a>
          ) : null}
        </div>
        <div className="pt-10">
          <div className="relative">
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
