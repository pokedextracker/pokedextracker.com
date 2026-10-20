import { faPencilAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { Link } from "react-router";

import { useSession } from "../../../hooks/contexts/use-session";
import { useUser } from "../../../hooks/queries/users";
import { useUserParams } from "../../../hooks/use-user-params";
import type { Dex } from "../../../types";
import { DexIndicator } from "../../library/DexIndicator";
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
    <div className="dex-preview" data-testid="dex-preview">
      <div className="dex-preview-header">
        <h3>
          <Link className="link" to={`/u/${user.username}/${dex.slug}`}>
            {dex.title}
          </Link>
        </h3>
        {ownPage && (
          <div className="dex-edit">
            <a
              className="link"
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
      <div className="percentage">
        <Progress caught={dex.caught} total={dex.total} />
      </div>
    </div>
  );
}
