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
    <div className="dex-search-bar">
      <div className="wrapper">
        <div className="form-group">
          <FontAwesomeIcon icon={faSearch} />
          <input
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="form-control"
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
            <a className="clear-btn" onClick={handleClearClick}>
              <FontAwesomeIcon className="input-icon" icon={faTimes} />
            </a>
          ) : null}
        </div>
        <div className="dex-search-bar-filters">
          <div className="form-group">
            <div className="checkbox">
              <label>
                <input
                  checked={hideCaught}
                  id="hide-caught"
                  name="hide-caught"
                  onChange={handleHideCaughtChange}
                  type="checkbox"
                />
                <span className="checkbox-custom">
                  <span />
                </span>
                Hide Caught Pokémon
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
