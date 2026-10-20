import { faLongArrowAltRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";

import { useSession } from "../../../hooks/contexts/use-session";
import { useUser } from "../../../hooks/queries/users";
import { useDexParams } from "../../../hooks/use-dex-params";
import { Footer } from "../../library/Footer";
import { FriendCode } from "../../library/FriendCode";
import { Header } from "../../library/Header";
import { Nav } from "../../library/Nav";
import { Notification } from "../../library/Notification";
import { Reload } from "../../library/Reload";
import { NotFound } from "../NotFound";
import { DexCreate } from "./DexCreate";
import { DexPreview } from "./DexPreview";

export function Profile() {
  const { username } = useDexParams();

  const { data: user, isPending: userIsLoading } = useUser(username);

  const { session } = useSession();

  const [showDexCreate, setShowDexCreate] = useState(false);

  useEffect(() => {
    document.title = `${username}'s Profile | Pokédex Tracker`;
  }, []);

  const handleCreateNewDexClick = () => setShowDexCreate(true);
  const handleDexCreateRequestClose = () => setShowDexCreate(false);

  if (userIsLoading) {
    return <div className="loading">Loading...</div>;
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
              <DexCreate
                isOpen={showDexCreate}
                onRequestClose={handleDexCreateRequestClose}
              />
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
