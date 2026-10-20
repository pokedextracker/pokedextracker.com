import { faTwitter } from "@fortawesome/free-brands-svg-icons";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import keyBy from "lodash/keyBy";
import { useEffect, useMemo, useState, type MouseEvent } from "react";

import { useSession } from "../../hooks/contexts/use-session";
import { useUser } from "../../hooks/queries/users";
import { useUserParams } from "../../hooks/use-user-params";
import type { Dex } from "../../types";
import { trackEvent } from "../../utils/analytics";
import { DexIndicator } from "./DexIndicator";
import { DonatedFlair } from "./DonatedFlair";
import { Share } from "./Share";

// The header atop a profile or dex.
export const header = "max-750:w-full";

// A link in the header, like the share toggle or the friend code's pencil,
// and the icon in it.
export const headerLink =
  "text-16 text-black-lighten-25 hover:cursor-pointer hover:text-black night:text-night-mode-link-gray night:hover:text-night-mode-link-gray-dark";
export const headerIcon = "relative bottom-4 ml-5 text-14";
export const headerPencil = "relative bottom-1 ml-5 text-12";

interface Props {
  profile?: boolean;
}

export function Header({ profile = false }: Props) {
  const { username, slug } = useUserParams();

  const { session } = useSession();
  const user = useUser(username).data!;
  const dex = useMemo<Dex | null>(
    () => (!profile ? keyBy(user.dexes, "slug")[slug] : null),
    [profile, user, slug],
  );

  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    const closeShare = () => setShowShare(false);

    window.addEventListener("click", closeShare);

    return () => window.removeEventListener("click", closeShare);
  }, []);

  const handleShareClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();

    trackEvent("Share", showShare ? "close" : "open");

    setShowShare((prev) => !prev);
  };

  const handleTweetClick = () => trackEvent("Share", "click tweet");

  const ownPage = session?.id === user.id;

  return (
    <div className="flex items-center">
      <h1 className="relative m-0 inline-block text-40 text-brand-secondary night:text-white max-750:text-30">
        {dex?.title || `${user.username}'s Profile`}
        <div className="relative inline-block max-750:[display:none]">
          <a
            className={`${headerLink} relative`}
            data-testid="share-toggle"
            onClick={handleShareClick}
          >
            <FontAwesomeIcon className={headerIcon} icon={faLink} />
            {showShare && <Share profile={profile} />}
          </a>
          <a
            className={`${headerLink} relative`}
            href={`https://twitter.com/intent/tweet?text=Check out ${ownPage ? "my" : `${user.username}'s`} ${profile ? "profile" : "living dex progress"} on @PokedexTracker! https://pokedextracker.com/u/${user.username}${dex ? `/${dex.slug}` : ""}`}
            onClick={handleTweetClick}
            rel="noopener noreferrer"
            target="_blank"
          >
            <FontAwesomeIcon className={headerIcon} icon={faTwitter} />
          </a>
        </div>
      </h1>
      {profile && <DonatedFlair className="ml-auto h-18" user={user} />}
      {dex && <DexIndicator dex={dex} />}
    </div>
  );
}
