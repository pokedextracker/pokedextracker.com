import { faPencilAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { useSession } from "../../hooks/contexts/use-session";
import { useUser } from "../../hooks/queries/users";
import { useUserParams } from "../../hooks/use-user-params";
import { trackEvent } from "../../utils/analytics";
import { tw } from "../../utils/tw";
import { headerLink, headerPencil } from "./Header";

const friendCode = tw`m-0 font-secondary text-15 font-normal`;

export function FriendCode() {
  const { username } = useUserParams();

  const { session } = useSession();
  const user = useUser(username).data!;

  const ownPage = session?.id === user.id;

  let editAccountBtn: ReactNode = null;

  if (ownPage) {
    const handleClick = () => trackEvent("User", "click edit friend code");

    editAccountBtn = (
      <Link className={headerLink} onClick={handleClick} to="/account">
        <FontAwesomeIcon className={headerPencil} icon={faPencilAlt} />
      </Link>
    );
  }

  return (
    <div>
      <h2 className={friendCode}>
        <b className="font-medium">3DS FC</b>:{" "}
        <span className={user.friend_code_3ds ? "" : "text-gray-medium"}>
          {user.friend_code_3ds || "XXXX-XXXX-XXXX"}
        </span>{" "}
        {editAccountBtn}
      </h2>
      <h2 className={friendCode}>
        <b className="font-medium">Switch FC</b>:{" "}
        <span className={user.friend_code_switch ? "" : "text-gray-medium"}>
          {user.friend_code_switch || "SW-XXXX-XXXX-XXXX"}
        </span>{" "}
        {editAccountBtn}
      </h2>
    </div>
  );
}
