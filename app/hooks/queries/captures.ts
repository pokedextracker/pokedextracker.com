import {
  useMutation,
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";

import type { Capture } from "../../types";
import { API, type PokedexTrackerError } from "../../utils/api";

export enum QueryKey {
  ListCaptures = "ListCaptures",
}

type ListCapturesData = Capture[];

export const useCaptures = (
  username: string,
  slug: string,
  options: Omit<
    UseQueryOptions<ListCapturesData, PokedexTrackerError>,
    "queryKey" | "queryFn"
  > = {},
) => {
  return useQuery<ListCapturesData, PokedexTrackerError, ListCapturesData>({
    ...options,
    queryKey: [QueryKey.ListCaptures, username, slug],
    queryFn: () => {
      return API.get(`/users/${username}/dexes/${slug}/captures`);
    },
  });
};

export interface CreateCapturesPayload {
  dex: number;
  pokemon: number[];
}

interface CreateCaptureMutationVariables {
  username: string;
  slug: string;
  payload: CreateCapturesPayload;
}

export const useCreateCapture = () => {
  return useMutation<
    Capture[],
    PokedexTrackerError,
    CreateCaptureMutationVariables
  >({
    mutationFn: ({ payload }) => {
      return API.post("/captures", payload);
    },
  });
};

export interface DeleteCapturesPayload {
  dex: number;
  pokemon: number[];
}

interface DeleteCaptureMutationVariables {
  username: string;
  slug: string;
  payload: DeleteCapturesPayload;
}

export const useDeleteCapture = () => {
  return useMutation<
    Capture[],
    PokedexTrackerError,
    DeleteCaptureMutationVariables
  >({
    mutationFn: ({ payload }) => {
      return API.delete("/captures", payload);
    },
  });
};
