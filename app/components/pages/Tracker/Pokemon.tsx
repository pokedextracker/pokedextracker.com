import { faInfo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import keyBy from "lodash/keyBy";
import { useMemo, type Dispatch, type SetStateAction } from "react";

import { useLocalStorageContext } from "../../../hooks/contexts/use-local-storage-context";
import { useSession } from "../../../hooks/contexts/use-session";
import {
  useCreateCapture,
  useDeleteCapture,
} from "../../../hooks/queries/captures";
import { useUser } from "../../../hooks/queries/users";
import { useDelayedRender } from "../../../hooks/use-delayed-render";
import { useUserParams } from "../../../hooks/use-user-params";
import type { Dex } from "../../../types";
import { trackEvent } from "../../../utils/analytics";
import { nationalId, padding } from "../../../utils/formatting";
import { iconClass } from "../../../utils/pokemon";
import { tw } from "../../../utils/tw";
import { PokemonName } from "../../library/PokemonName";
import { useTrackerContext, type UICapture } from "./use-tracker";

interface Props {
  capture: UICapture | null;
  delay?: number;
  // In search results, where the tiles overlap their borders on a desktop.
  searchResult?: boolean;
  setSelectedPokemon: Dispatch<SetStateAction<number>>;
}

// tileClassName is a tile's own classes. Its background shows whether it's
// caught or pending.
function tileClassName({
  captured = false,
  empty = false,
  pending = false,
  readOnly = true,
  searchResult = false,
}: {
  captured?: boolean;
  empty?: boolean;
  pending?: boolean;
  readOnly?: boolean;
  searchResult?: boolean;
}): string {
  return classNames(
    "group/tile relative flex h-110 w-110 max-750:h-80 max-750:w-full",
    captured ? "bg-caught dark:text-black" : "",
    pending && "bg-pending",
    !empty && !readOnly && "hover:cursor-pointer",
    empty && "max-750:hidden",
    searchResult &&
      "min-751:-mt-2 min-751:-ml-2 min-751:h-112 min-751:w-112 min-751:hover:z-1 min-751:nth-[6n+1]:ml-0",
  );
}

// The tile's border on a desktop, which darkens when it's caught, or on hover
// when it can be marked.
function desktopClassName({
  captured = false,
  hoverable = false,
  searchResult = false,
}: {
  captured?: boolean;
  hoverable?: boolean;
  searchResult?: boolean;
}): string {
  return classNames(
    "flex grow flex-col items-center justify-center border max-750:hidden",
    captured ? "border-line-caught" : "border-line",
    !captured && hoverable && "group-hover/tile:border-line-caught",
    searchResult && "min-751:border-2",
  );
}

// The tile on a phone, a row with its border.
function mobileClassName(captured = false): string {
  return classNames(
    "hidden grow items-center border max-750:flex",
    captured ? "border-line-caught" : "border-line",
  );
}

export function Pokemon({
  capture,
  delay = 0,
  searchResult = false,
  setSelectedPokemon,
}: Props) {
  const render = useDelayedRender(delay);

  const { username, slug } = useUserParams();

  const { setCaptures } = useTrackerContext();
  const { setShowInfo } = useLocalStorageContext();

  const { session } = useSession();
  const user = useUser(username).data!;
  const dex = useMemo<Dex | undefined>(
    () => keyBy(user.dexes, "slug")[slug],
    [user, slug],
  );

  const createCapturesMutation = useCreateCapture();
  const deleteCapturesMutation = useDeleteCapture();

  if (!render || !capture) {
    return (
      <div className={tileClassName({ empty: true, searchResult })}>
        <div className={desktopClassName({ searchResult })} />
        <div className={mobileClassName()} />
      </div>
    );
  }

  const handleSetCapturedClick = async () => {
    if (!session || session.id !== user.id) {
      return;
    }

    if (!dex) {
      // This shouldn't really happen, but just in case the dex wasn't loaded in, we don't want a hard crash.
      return;
    }

    if (createCapturesMutation.isPending || deleteCapturesMutation.isPending) {
      // We're already making a request, so exit early.
      return;
    }

    createCapturesMutation.reset();
    deleteCapturesMutation.reset();

    const payload = { dex: dex.id, pokemon: [capture.pokemon.id] };

    setCaptures((prev) =>
      prev.map((cap) => {
        if (cap.pokemon.id !== capture.pokemon.id) {
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

    // Marking isn't sent to analytics: it's the most frequent thing visitors
    // do, and the captures themselves are already in the database.
    if (capture.captured) {
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
        if (cap.pokemon.id !== capture.pokemon.id) {
          // We're not modifying this one.
          return cap;
        }
        return {
          ...cap,
          pending: false,
          captured: !capture.captured,
        };
      }),
    );
  };

  const handleSetInfoClick = () => {
    trackEvent("Pokemon", "show info", capture.pokemon.name);

    setSelectedPokemon(capture.pokemon.id);
    setShowInfo(true);
  };

  if (!dex) {
    // The dex wasn't fully loaded, so we don't show anything until it loads.
    return null;
  }

  const readOnly = !session || session.id !== user.id;

  // The circle behind a Legends: Arceus icon, lighter on a caught tile.
  const circle = capture.captured
    ? tw`bg-icon-circle-caught`
    : tw`bg-icon-circle`;

  const regional = dex.dex_type.tags.includes("regional");
  const idToDisplay = regional
    ? capture.pokemon.dex_number === -1
      ? "---"
      : capture.pokemon.dex_number
    : nationalId(capture.pokemon.national_id);
  const paddingDigits = dex.total >= 1000 ? 4 : 3;

  return (
    <div
      className={tileClassName({
        captured: capture.captured,
        pending: capture.pending,
        readOnly,
        searchResult,
      })}
      data-captured={capture.captured}
      data-read-only={readOnly}
      data-testid="pokemon"
    >
      <div
        className={desktopClassName({
          captured: capture.captured,
          hoverable: !readOnly,
          searchResult,
        })}
        data-testid="set-captured"
        onClick={handleSetCapturedClick}
      >
        <h4 className="m-0 text-17 font-normal">
          <PokemonName name={capture.pokemon.name} />
        </h4>
        <div className="flex h-49 items-center">
          <i className={iconClass(capture.pokemon, dex, circle)} />
        </div>
        <p className="m-0 font-secondary text-12 font-normal">
          #{padding(idToDisplay, paddingDigits)}
        </p>
      </div>
      <div
        className={mobileClassName(capture.captured)}
        onClick={handleSetCapturedClick}
      >
        <div className="min-w-52 px-6 py-0 text-center">
          <i className={iconClass(capture.pokemon, dex, circle)} />
        </div>
        <h4 className="m-0 grow text-20 font-normal">
          <PokemonName name={capture.pokemon.name} />
        </h4>
        <p className="m-0 pr-10 font-secondary text-11">
          #{padding(idToDisplay, paddingDigits)}
        </p>
      </div>
      <div
        className={classNames(
          "group/info absolute right-0 bottom-0 flex p-5 opacity-0 group-hover/tile:opacity-100 hover:cursor-pointer max-750:relative max-750:w-50 max-750:items-center max-750:justify-center max-750:border max-750:opacity-100 min-751:hover:-right-1 min-751:hover:-bottom-1",
          capture.captured ? "border-line-caught" : "border-line",
        )}
        data-testid="set-info"
        onClick={handleSetInfoClick}
      >
        <FontAwesomeIcon
          className="m-2 h-21 w-21 rounded-half border-2 border-solid border-link p-4 text-14 text-link group-hover/info:m-3 group-hover/info:h-22 group-hover/info:w-22 group-hover/info:border-blue-900 group-hover/info:text-blue-900 dark:group-hover/info:border-blue-400 dark:group-hover/info:text-blue-400"
          icon={faInfo}
        />
      </div>
    </div>
  );
}
