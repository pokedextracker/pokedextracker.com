import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { API } from '../../utils/api';
import { QueryKey as CaptureQueryKey } from './captures';
import { QueryKey as UserQueryKey } from './users';

import type { Dex } from '../../types';
import type { PokedexTrackerError } from '../../utils/api';
import type { UseQueryOptions } from '@tanstack/react-query';

export enum QueryKey {
  RetrieveDex = 'RetrieveDex',
}

export const useDex = (username: string, slug: string, options: UseQueryOptions<Dex, PokedexTrackerError> = {}) => {
  return useQuery<Dex, PokedexTrackerError>({
    ...options,
    queryKey: [QueryKey.RetrieveDex, username, slug],
    queryFn: () => {
      return API.get(`/users/${username}/dexes/${slug}`);
    },
  });
};

export interface CreateDexPayload {
  title: string;
  slug: string;
  shiny: boolean;
  game: string;
  dex_type: number;
}

interface CreateDexMutationVariables {
  username: string;
  payload: CreateDexPayload;
}

export const useCreateDex = () => {
  const queryClient = useQueryClient();

  return useMutation<Dex, PokedexTrackerError, CreateDexMutationVariables>({
    mutationFn: ({ username, payload }) => {
      return API.post(`/users/${username}/dexes`, payload);
    },
    onSuccess: (_data, { username }) => {
      queryClient.invalidateQueries([UserQueryKey.RetrieveUser, username]);
    },
  });
};

export interface UpdateDexPayload {
  title?: string;
  slug?: string;
  shiny?: boolean;
  game?: string;
  dex_type?: number;
}

interface UpdateDexMutationVariables {
  username: string;
  slug: string;
  payload: UpdateDexPayload;
}

export const useUpdateDex = () => {
  const queryClient = useQueryClient();

  return useMutation<Dex, PokedexTrackerError, UpdateDexMutationVariables>({
    mutationFn: ({ username, slug, payload }) => {
      return API.post(`/users/${username}/dexes/${slug}`, payload);
    },
    onSuccess: (_data, { username, slug }) => {
      queryClient.invalidateQueries([QueryKey.RetrieveDex, username, slug]);
      queryClient.invalidateQueries([CaptureQueryKey.ListCaptures, username, slug]);
      queryClient.invalidateQueries([UserQueryKey.RetrieveUser, username]);
    },
  });
};

interface DeleteDexMutationVariables {
  username: string;
  slug: string;
}

export const useDeleteDex = () => {
  const queryClient = useQueryClient();

  return useMutation<Dex, PokedexTrackerError, DeleteDexMutationVariables>({
    mutationFn: ({ username, slug }) => {
      return API.delete(`/users/${username}/dexes/${slug}`);
    },
    onSuccess: (_data, { username }) => {
      queryClient.invalidateQueries([UserQueryKey.RetrieveUser, username]);
    },
  });
};
