import { useRef } from "react";

import { useUserParams } from "../../hooks/use-user-params";
import { trackEvent } from "../../utils/analytics";
import { formControlClassName } from "./Form";

interface Props {
  profile: boolean;
}

export function Share({ profile }: Props) {
  const { username, slug } = useUserParams();

  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    trackEvent("Share", "select link");
    inputRef.current?.select();
  };

  return (
    <div
      className="absolute bottom-[200%] left-1/2 z-1 -ml-150 w-300 border-2 border-solid border-gray-light bg-surface p-10 text-14 after:absolute after:top-full after:left-1/2 after:-ml-8 after:border-8 after:border-solid after:border-transparent after:border-t-gray-light after:content-['_'] dark:border-night-mode-02dp dark:text-white dark:after:border-t-night-mode-02dp"
      onClick={(e) => e.stopPropagation()}
    >
      Share this {profile ? "Profile" : "Living Dex"}:
      <input
        className={formControlClassName("mt-5 p-6 text-12")}
        onClick={handleClick}
        readOnly
        ref={inputRef}
        value={`https://pokedextracker.com/u/${username}${profile ? "" : `/${slug}`}`}
      />
    </div>
  );
}
