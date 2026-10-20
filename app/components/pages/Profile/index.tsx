import { faLongArrowAltRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";

import { useSession } from "../../../hooks/contexts/use-session";
import { useDexTypes } from "../../../hooks/queries/dex-types";
import { useGames } from "../../../hooks/queries/games";
import { useUser } from "../../../hooks/queries/users";
import { useUserParams } from "../../../hooks/use-user-params";
import { isNotFound } from "../../../utils/api";
import { Footer } from "../../library/Footer";
import { FriendCode } from "../../library/FriendCode";
import { Header } from "../../library/Header";
import { LoadError } from "../../library/LoadError";
import { Nav } from "../../library/Nav";
import { Notification } from "../../library/Notification";
import { Reload } from "../../library/Reload";
import { NotFound } from "../NotFound";
import { DexCreate } from "./DexCreate";
import { DexPreview } from "./DexPreview";

export function Profile() {
  const { username } = useUserParams();

  const {
    data: user,
    error: userError,
    isPending: userIsPending,
  } = useUser(username);

  const { session } = useSession();
  const ownPage = Boolean(user && session?.id === user.id);

  // The create and edit dex modals need these. Loading them with your own
  // profile means the modals open with them ready.
  useGames({ enabled: ownPage });
  useDexTypes({ enabled: ownPage });

  const [showDexCreate, setShowDexCreate] = useState(false);

  useEffect(() => {
    document.title = `${username}'s Profile | Pokédex Tracker`;
  }, [username]);

  const handleCreateNewDexClick = () => setShowDexCreate(true);
  const handleDexCreateRequestClose = () => setShowDexCreate(false);

  if (userIsPending) {
    return <div className="loading">Loading...</div>;
  }

  // A failed refresh of a user who's already loaded doesn't count: the page can
  // still show them.
  if (userError && !user && !isNotFound(userError)) {
    return <LoadError error={userError} thing="profile" />;
  }

  if (!user) {
    return <NotFound />;
  }

  return (
    <div className="profile-container">
      <Nav />
      <Reload />
      <div className="profile">
        <div className="wrapper">
          <header>
            <Notification />
            <Header profile />
            <FriendCode />
          </header>

          {user.dexes.map((dex) => (
            <DexPreview dex={dex} key={dex.id} />
          ))}

          {ownPage && (
            <div className="dex-create">
              <div className="btn btn-blue" onClick={handleCreateNewDexClick}>
                Create a New Dex <FontAwesomeIcon icon={faLongArrowAltRight} />
              </div>
              {showDexCreate && (
                <DexCreate onRequestClose={handleDexCreateRequestClose} />
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
