import { useQuery } from '@tanstack/react-query';

import { API } from '../../utils/api';

import type { Game } from '../../types';
import type { PokedexTrackerError } from '../../utils/api';
import type { UseQueryOptions } from '@tanstack/react-query';

export enum QueryKey {
  ListGames = 'ListGames',
}

type ListGamesData = Game[];

export const useGames = (options: UseQueryOptions<ListGamesData, PokedexTrackerError> = {}) => {
  return useQuery<ListGamesData, PokedexTrackerError, ListGamesData>({
    ...options,
    queryKey: [QueryKey.ListGames],
    queryFn: () => {
      return API.get('/games');
    },
  });
};
