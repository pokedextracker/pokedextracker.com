import { useMutation } from "@tanstack/react-query";

import type { Session } from "../../types";
import { API, type PokedexTrackerError } from "../../utils/api";
import { tokenToUser } from "../../utils/state";

export interface LoginPayload {
  username: string;
  password: string;
}

interface LoginMutationVariables {
  payload: LoginPayload;
}

export const useLogin = () => {
  return useMutation<Session, PokedexTrackerError, LoginMutationVariables>({
    mutationFn: async ({ payload }: LoginMutationVariables) => {
      const { token } = await API.post<{ token: string }>("/sessions", payload);
      return tokenToUser(token) as Session;
    },
  });
};
