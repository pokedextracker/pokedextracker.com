import { faPencilAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { Link } from "react-router";

import { useSession } from "../../../hooks/contexts/use-session";
import { useUser } from "../../../hooks/queries/users";
import { useUserParams } from "../../../hooks/use-user-params";
import type { Dex } from "../../../types";
import { DexIndicator } from "../../library/DexIndicator";
import { link } from "../../library/links";
import { Progress } from "../../library/Progress";
import { DexEdit } from "./DexEdit";

interface Props {
  dex: Dex;
}

export function DexPreview({ dex }: Props) {
  const { username } = useUserParams();

  const user = useUser(username).data!;

  const { session } = useSession();

  const [showEditDex, setShowEditDex] = useState(false);

  const handleRequestClose = () => {
    setShowEditDex(false);
  };

  const handleEditClick = () => setShowEditDex(true);

  const ownPage = session?.id === user.id;

  return (
    <div className="mt-40 max-750:mb-60" data-testid="dex-preview">
      <div className="relative mb-8 flex items-baseline">
        <h3 className="m-0 min-w-0">
          <Link
            className={`${link} block truncate pr-10 text-20`}
            to={`/u/${user.username}/${dex.slug}`}
          >
            {dex.title}
          </Link>
        </h3>
        {ownPage && (
          <div>
            <a
              className="cursor-pointer text-14 font-medium text-muted-link underline transition-all duration-100 ease-out hover:text-muted-link-hover"
              data-testid="dex-edit-toggle"
              onClick={handleEditClick}
            >
              <FontAwesomeIcon icon={faPencilAlt} />
            </a>
            {showEditDex && (
              <DexEdit dex={dex} onRequestClose={handleRequestClose} />
            )}
          </div>
        )}
        <DexIndicator dex={dex} />
      </div>
      <div className="flex justify-between">
        <Progress caught={dex.caught} total={dex.total} />
      </div>
    </div>
  );
}
