import { useQuery } from '@tanstack/react-query';

export enum QueryKey {
  RetrieveVersion = 'RetrieveVersion',
}

export const useVersion = () => {
  return useQuery<string, Error, string>({
    queryKey: [QueryKey.RetrieveVersion],
    queryFn: async () => {
      const resp = await fetch('/version', { method: 'GET' });
      const text = await resp.text();
      return text.trim();
    },
    refetchInterval: 30_000,
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: 'always',
  });
};
