import { faLongArrowAltRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";

import { useSession } from "../../../hooks/contexts/use-session";
import { useUser } from "../../../hooks/queries/users";
import { useUserParams } from "../../../hooks/use-user-params";
import { Footer } from "../../library/Footer";
import { FriendCode } from "../../library/FriendCode";
import { Header } from "../../library/Header";
import { isNotFound, LoadError } from "../../library/LoadError";
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

  const [showDexCreate, setShowDexCreate] = useState(false);

  useEffect(() => {
    document.title = `${username}'s Profile | Pokédex Tracker`;
  }, [username]);

  const handleCreateNewDexClick = () => setShowDexCreate(true);
  const handleDexCreateRequestClose = () => setShowDexCreate(false);

  if (userIsPending) {
    return <div className="loading">Loading...</div>;
  }

  if (userError && !isNotFound(userError)) {
    return <LoadError error={userError} thing="profile" />;
  }

  if (!user) {
    return <NotFound />;
  }

  const ownPage = session?.id === user.id;

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
