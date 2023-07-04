import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { API } from '../../utils/api';

import type { Capture } from '../../types';
import type { PokedexTrackerError } from '../../utils/api';
import type { UseQueryOptions } from '@tanstack/react-query';

export enum QueryKey {
  ListCaptures = 'ListCaptures',
}

type ListCapturesData = Capture[];

export const useCaptures = (username: string, slug: string, options: UseQueryOptions<ListCapturesData, PokedexTrackerError> = {}) => {
  return useQuery<ListCapturesData, PokedexTrackerError>({
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
  const queryClient = useQueryClient();

  return useMutation<Capture[], PokedexTrackerError, CreateCaptureMutationVariables>({
    mutationFn: ({ payload }) => {
      return API.post('/captures', payload);
    },
    onSuccess: (_data, { username, slug }) => {
      queryClient.invalidateQueries([QueryKey.ListCaptures, { username, slug }]);
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
  const queryClient = useQueryClient();

  return useMutation<Capture[], PokedexTrackerError, DeleteCaptureMutationVariables>({
    mutationFn: ({ payload }) => {
      return API.delete('/captures', payload);
    },
    onSuccess: (_data, { username, slug }) => {
      queryClient.invalidateQueries([QueryKey.ListCaptures, { username, slug }]);
    },
  });
};
