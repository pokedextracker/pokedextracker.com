import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import type { Pokemon } from "../../types";
import { API, type PokedexTrackerError } from "../../utils/api";

export enum QueryKey {
  RetrievePokemon = "RetrievePokemon",
}

interface RetrievePokemonQuery {
  dex_type: number;
}

export const usePokemon = (
  id: number,
  query: RetrievePokemonQuery,
  options: Omit<
    UseQueryOptions<Pokemon, PokedexTrackerError>,
    "queryKey" | "queryFn"
  > = {},
) => {
  return useQuery<Pokemon, PokedexTrackerError, Pokemon>({
    ...options,
    queryKey: [QueryKey.RetrievePokemon, id, query],
    queryFn: () => {
      return API.get(`/pokemon/${id}`, query);
    },
  });
};
