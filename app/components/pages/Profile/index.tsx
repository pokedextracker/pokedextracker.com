import { faLongArrowAltRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";

import { useSession } from "../../../hooks/contexts/use-session";
import { useDexTypes } from "../../../hooks/queries/dex-types";
import { useGames } from "../../../hooks/queries/games";
import { useUser } from "../../../hooks/queries/users";
import { useUserParams } from "../../../hooks/use-user-params";
import { isNotFound } from "../../../utils/api";
import { buttonClassName, buttonIcon } from "../../library/Button";
import { Footer } from "../../library/Footer";
import { FriendCode } from "../../library/FriendCode";
import { Header } from "../../library/Header";
import { pageContainer, wrapper } from "../../library/layout";
import { LoadError } from "../../library/LoadError";
import { Loading } from "../../library/Loading";
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
    return <Loading>Loading...</Loading>;
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
    <div className={pageContainer}>
      <Nav />
      <Reload />
      <div className="relative top-70 flex-[1_0_auto] animate-slide-fast overflow-y-auto px-0 pt-100 pb-60 dark:bg-night max-750:px-15 max-750:pt-40 max-750:pb-20">
        <div className={wrapper}>
          <header>
            <Notification />
            <Header profile />
            <FriendCode />
          </header>

          {user.dexes.map((dex) => (
            <DexPreview dex={dex} key={dex.id} />
          ))}

          {ownPage && (
            <div className="mx-0 my-40 text-center">
              <div
                className={buttonClassName(
                  "blue",
                  "inline-block w-200 p-12 text-11 max-500:w-full",
                )}
                onClick={handleCreateNewDexClick}
              >
                {"Create a New Dex "}
                <FontAwesomeIcon
                  className={buttonIcon}
                  icon={faLongArrowAltRight}
                />
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
