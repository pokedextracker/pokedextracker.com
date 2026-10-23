import keyBy from "lodash/keyBy";
import {
  useMemo,
  type Dispatch,
  type MouseEventHandler,
  type SetStateAction,
} from "react";
import { Link } from "react-router";

import { useUser } from "../../../hooks/queries/users";
import { useUserParams } from "../../../hooks/use-user-params";
import { trackEvent } from "../../../utils/analytics";
import { groupBoxes } from "../../../utils/pokemon";
import { DonatedFlair } from "../../library/DonatedFlair";
import { FriendCode } from "../../library/FriendCode";
import { Header } from "../../library/Header";
import { wrapper } from "../../library/layout";
import { Notification } from "../../library/Notification";
import { Progress } from "../../library/Progress";
import { Box } from "./Box";
import { Scroll } from "./Scroll";
import { SearchResults } from "./SearchResults";
import { useTrackerContext } from "./use-tracker";

const DEFER_CUTOFF = 1;

interface Props {
  hideCaught: boolean;
  onScrollButtonClick: MouseEventHandler<HTMLDivElement>;
  query: string;
  setHideCaught: Dispatch<SetStateAction<boolean>>;
  setQuery: Dispatch<SetStateAction<string>>;
  setSelectedPokemon: Dispatch<SetStateAction<number>>;
  showScrollButton: boolean;
}

export function Dex({
  hideCaught,
  onScrollButtonClick,
  query,
  setHideCaught,
  setQuery,
  setSelectedPokemon,
  showScrollButton,
}: Props) {
  const { username, slug } = useUserParams();

  const user = useUser(username).data!;
  const dex = useMemo(() => keyBy(user.dexes, "slug")[slug], [user, slug]);

  const { captures } = useTrackerContext();

  const caught = useMemo(
    () => captures.filter(({ captured }) => captured).length,
    [captures],
  );
  const total = captures.length;

  const groupedCaptures = useMemo(() => groupBoxes(captures), [captures]);
  const boxes = useMemo(() => {
    return groupedCaptures.map((box, i) => (
      <Box
        captures={box}
        deferred={i > DEFER_CUTOFF}
        dexTotal={dex.total}
        key={box[0].pokemon.id}
        setSelectedPokemon={setSelectedPokemon}
      />
    ));
  }, [groupedCaptures, dex.total, setSelectedPokemon]);

  return (
    <div className="flex-[1_0_auto] px-0 py-100 max-750:p-15 max-400:pr-35">
      <div className={wrapper}>
        <Scroll onClick={onScrollButtonClick} showScroll={showScrollButton} />
        <Notification />
        <header>
          <Header />
          <h3 className="mx-0 mt-0 mb-8">
            <Link
              className="text-16 text-black-lighten-35 hover:cursor-pointer hover:text-black-lighten-25 dark:text-night-mode-link-gray dark:hover:text-night-mode-link-gray-dark"
              onClick={() => trackEvent("User", "click view profile")}
              to={`/u/${username}`}
            >
              /u/{username}
            </Link>
            <DonatedFlair className="ml-4 h-15 align-middle" user={user} />
          </h3>
          <FriendCode />
        </header>
        <div className="mt-20 flex justify-between max-750:mt-15">
          <Progress caught={caught} total={total} />
        </div>
        {query.length > 0 || hideCaught ? (
          <SearchResults
            captures={captures}
            hideCaught={hideCaught}
            query={query}
            setHideCaught={setHideCaught}
            setQuery={setQuery}
            setSelectedPokemon={setSelectedPokemon}
          />
        ) : (
          boxes
        )}
      </div>
    </div>
  );
}
