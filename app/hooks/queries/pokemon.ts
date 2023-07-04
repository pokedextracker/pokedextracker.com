import { useQuery } from '@tanstack/react-query';

import { API } from '../../utils/api';

import type { PokedexTrackerError } from '../../utils/api';
import type { Pokemon } from '../../types';
import type { UseQueryOptions } from '@tanstack/react-query';

export enum QueryKey {
  RetrievePokemon = 'RetrievePokemon',
}

interface RetrievePokemonQuery {
  dex_type: number;
}

export const usePokemon = (id: number, query: RetrievePokemonQuery, options: UseQueryOptions<Pokemon, PokedexTrackerError> = {}) => {
  return useQuery<Pokemon, PokedexTrackerError>({
    ...options,
    queryKey: [QueryKey.RetrievePokemon, id, query],
    queryFn: () => {
      return API.get(`/pokemon/${id}`, query);
    },
  });
};
