import { useQuery } from '@tanstack/react-query';

import { API } from '../../utils/api';

import type { DexType } from '../../types';
import type { PokedexTrackerError } from '../../utils/api';
import type { UseQueryOptions } from '@tanstack/react-query';

export enum QueryKey {
  ListDexTypes = 'ListDexTypes',
}

type ListDexTypesData = DexType[];

export const useDexTypes = (options: UseQueryOptions<ListDexTypesData, PokedexTrackerError> = {}) => {
  return useQuery<ListDexTypesData, PokedexTrackerError>({
    ...options,
    queryKey: [QueryKey.ListDexTypes],
    queryFn: () => {
      return API.get('/dex-types');
    },
  });
};
