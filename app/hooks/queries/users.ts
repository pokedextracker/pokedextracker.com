import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { API } from '../../utils/api';
import { tokenToUser } from '../../utils/state';

import type { PokedexTrackerError } from '../../utils/api';
import type { Session, User } from '../../types';
import type { UseQueryOptions } from '@tanstack/react-query';

export enum QueryKey {
  RetrieveUser = 'RetrieveUser',
}

export const useUser = (username: string, options: UseQueryOptions<User, PokedexTrackerError> = {}) => {
  return useQuery<User, PokedexTrackerError>({
    ...options,
    queryKey: [QueryKey.RetrieveUser, username],
    queryFn: () => {
      return API.get(`/users/${username}`);
    },
  });
};

export interface CreateUserPayload {
  username: string;
  password: string;
  friend_code_3ds?: string;
  friend_code_switch?: string;
  referrer?: string;
  title: string;
  slug: string;
  shiny: boolean;
  game: string;
  dex_type: number;
}

interface CreateUserMutationVariables {
  payload: CreateUserPayload;
}

export const useCreateUser = () => {
  return useMutation<User, PokedexTrackerError, CreateUserMutationVariables>({
    mutationFn: ({ payload }) => {
      return API.post('/users', payload);
    },
  });
};

export interface UpdateUserPayload {
  password?: string;
  friend_code_3ds?: string;
  friend_code_switch?: string;
}

interface UpdateUserMutationVariables {
  username: string;
  payload: UpdateUserPayload;
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation<Session, PokedexTrackerError, UpdateUserMutationVariables>({
    mutationFn: async ({ username, payload }) => {
      const { token } = await API.post<{ token: string }>(`/users/${username}`, payload);
      return tokenToUser(token) as Session;
    },
    onSuccess: (_data, { username }) => {
      queryClient.invalidateQueries([QueryKey.RetrieveUser, username]);
    },
  });
};