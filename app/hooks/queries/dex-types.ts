import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import type { DexType } from "../../types";
import { API, type PokedexTrackerError } from "../../utils/api";

export enum QueryKey {
  ListDexTypes = "ListDexTypes",
}

type ListDexTypesData = DexType[];

export const useDexTypes = (
  options: UseQueryOptions<ListDexTypesData, PokedexTrackerError> = {},
) => {
  return useQuery<ListDexTypesData, PokedexTrackerError, ListDexTypesData>({
    ...options,
    queryKey: [QueryKey.ListDexTypes],
    queryFn: () => {
      return API.get("/dex-types");
    },
  });
};
