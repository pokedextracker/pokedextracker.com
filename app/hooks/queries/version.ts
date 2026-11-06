import { useQuery } from "@tanstack/react-query";

import { Config } from "../../../config";

export enum QueryKey {
  RetrieveVersion = "RetrieveVersion",
}

export const useVersion = () => {
  return useQuery<string, Error, string>({
    queryKey: [QueryKey.RetrieveVersion],
    queryFn: async () => {
      const resp = await fetch("/version", { method: "GET" });
      // Anything but the plain text ID isn't a version, and shouldn't look
      // like a new one: a proxy's 502, or a captive portal's login page,
      // which usually comes back as a 200 HTML page.
      const type = resp.headers.get("Content-Type") ?? "";
      if (!resp.ok || !type.startsWith("text/plain")) {
        throw new Error(
          `Couldn't check the version: ${resp.status} ${type}`.trim(),
        );
      }
      const text = await resp.text();
      return text.trim();
    },
    refetchInterval: 30_000,
    refetchOnReconnect: "always",
    refetchOnWindowFocus: "always",
  });
};

// useNewBuildIsOut reports whether a newer frontend has been deployed than the
// one this tab is running. Config.BUILD is the build the page loaded with.
export const useNewBuildIsOut = (): boolean => {
  const { data: version } = useVersion();
  return version !== undefined && version !== Config.BUILD;
};
