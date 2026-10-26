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
import { tw } from "../../utils/tw";
import { DonatedFlair } from "./DonatedFlair";
import { Share } from "./Share";

// A link in the header, like the share toggle or the friend code's pencil,
// and the icon in it.
export const headerLink = tw`text-16 text-muted-link hover:cursor-pointer hover:text-muted-link-hover`;
const headerIcon = tw`relative bottom-4 ml-5 text-14`;
export const headerPencil = tw`relative bottom-1 ml-5 text-12`;

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

  // The icons stay on the title's last word, so a squeezed header wraps them
  // along with that word instead of on their own.
  const title = dex?.title || `${user.username}'s Profile`;
  const lastSpace = title.lastIndexOf(" ");

  return (
    <div className="flex items-center">
      <h1 className="relative m-0 inline-block text-40 text-strong max-750:text-30">
        {title.slice(0, lastSpace + 1)}
        <span className="whitespace-nowrap">
          {title.slice(lastSpace + 1)}
          <span className="relative inline-block whitespace-normal max-750:hidden">
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
          </span>
        </span>
      </h1>
      {profile && <DonatedFlair className="ml-auto h-18" user={user} />}
    </div>
  );
}
