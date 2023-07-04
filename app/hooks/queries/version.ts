import { useQuery } from '@tanstack/react-query';

export enum QueryKey {
  RetrieveVersion = 'RetrieveVersion',
}

interface VersionResponse {
  version: string;
}

export const useVersion = () => {
  return useQuery<VersionResponse>({
    queryKey: [QueryKey.RetrieveVersion],
    queryFn: async () => {
      const resp = await fetch('/version', { method: 'GET' });
      const text = await resp.text();
      return { version: text.trim() };
    },
    refetchInterval: 30_000,
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: 'always',
  });
};
