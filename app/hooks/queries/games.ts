import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import type { Game } from "../../types";
import { API, type PokedexTrackerError } from "../../utils/api";

export enum QueryKey {
  ListGames = "ListGames",
}

type ListGamesData = Game[];

export const useGames = (
  options: UseQueryOptions<ListGamesData, PokedexTrackerError> = {},
) => {
  return useQuery<ListGamesData, PokedexTrackerError, ListGamesData>({
    ...options,
    queryKey: [QueryKey.ListGames],
    queryFn: () => {
      return API.get("/games");
    },
  });
};
