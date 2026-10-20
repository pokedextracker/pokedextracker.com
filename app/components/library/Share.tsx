import { useRef } from "react";

import { useUserParams } from "../../hooks/use-user-params";
import { trackEvent } from "../../utils/analytics";
import { formControl } from "./Form";

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
    <div className="share" onClick={(e) => e.stopPropagation()}>
      Share this {profile ? "Profile" : "Living Dex"}:
      <input
        className={formControl("mt-5 p-6 text-12")}
        onClick={handleClick}
        readOnly
        ref={inputRef}
        value={`https://pokedextracker.com/u/${username}${profile ? "" : `/${slug}`}`}
      />
    </div>
  );
}
