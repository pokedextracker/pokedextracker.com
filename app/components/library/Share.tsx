import { useRef } from "react";

import { useUserParams } from "../../hooks/use-user-params";
import { trackEvent } from "../../utils/analytics";

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
        className="form-control"
        onClick={handleClick}
        readOnly
        ref={inputRef}
        value={`https://pokedextracker.com/u/${username}${profile ? "" : `/${slug}`}`}
      />
    </div>
  );
}
