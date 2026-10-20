import { faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import keyBy from "lodash/keyBy";
import { useMemo } from "react";
import { useParams } from "react-router";

import { useSession } from "../../../hooks/contexts/use-session";
import {
  useCreateCapture,
  useDeleteCapture,
} from "../../../hooks/queries/captures";
import { useUser } from "../../../hooks/queries/users";
import { trackEvent } from "../../../utils/analytics";
import { padding } from "../../../utils/formatting";
import { useTrackerContext, type UICapture } from "./use-tracker";

interface Props {
  captures: UICapture[];
}

export function MarkAllButton({ captures }: Props) {
  const { username, slug } = useParams<{ username: string; slug: string }>();

  const { session } = useSession();
  const user = useUser(username).data!;
  const dex = useMemo(() => keyBy(user.dexes, "slug")[slug], [user, slug]);

  const { setCaptures } = useTrackerContext();

  const createCapturesMutation = useCreateCapture();
  const deleteCapturesMutation = useDeleteCapture();

  const uncaught = useMemo(() => {
    return captures.reduce(
      (total, capture) => total + (capture.captured ? 0 : 1),
      0,
    );
  }, [captures]);

  const ownPage = session?.id === user.id;

  if (!ownPage) {
    return null;
  }

  const handleButtonClick = async () => {
    createCapturesMutation.reset();
    deleteCapturesMutation.reset();

    const deleting = uncaught === 0;
    const pokemon = captures
      .filter((capture) => capture.captured === deleting)
      .map((capture) => capture.pokemon.id);
    const payload = { dex: dex.id, pokemon };

    setCaptures((prev) =>
      prev.map((cap) => {
        if (!pokemon.includes(cap.pokemon.id)) {
          // We're not modifying this one.
          return cap;
        }
        return {
          ...cap,
          pending: true,
          // We need to make it look like captured is false, otherwise, the pending styles won't show up.
          captured: false,
        };
      }),
    );

    if (deleting) {
      await deleteCapturesMutation.mutateAsync({
        username: user.username,
        slug,
        payload,
      });
    } else {
      await createCapturesMutation.mutateAsync({
        username: user.username,
        slug,
        payload,
      });
    }

    setCaptures((prev) =>
      prev.map((cap) => {
        if (!pokemon.includes(cap.pokemon.id)) {
          // We're not modifying this one.
          return cap;
        }
        return {
          ...cap,
          pending: false,
          captured: !deleting,
        };
      }),
    );

    trackEvent(
      "Box",
      deleting ? "unmark all" : "mark all",
      `${padding(captures[0].pokemon.national_id, 3)} - ${padding(captures[captures.length - 1].pokemon.national_id, 3)}`,
    );
  };

  const isLoading =
    createCapturesMutation.isPending || deleteCapturesMutation.isPending;

  return (
    <button
      className="btn btn-blue"
      disabled={isLoading}
      onClick={handleButtonClick}
    >
      <span className={isLoading ? "hidden" : ""}>
        {uncaught === 0 ? "Unmark" : "Mark"} All
      </span>
      {isLoading ? (
        <span className="spinner">
          <FontAwesomeIcon icon={faCircleNotch} spin />
        </span>
      ) : null}
    </button>
  );
}
