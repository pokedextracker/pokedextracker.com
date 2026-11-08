import { useQueryClient } from "@tanstack/react-query";
import {
  startTransition,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Modal from "react-modal";
import { useNavigate } from "react-router";

import { useSession } from "../../hooks/contexts/use-session";
import { QueryKey as CaptureQueryKey } from "../../hooks/queries/captures";
import { QueryKey as DexQueryKey } from "../../hooks/queries/dexes";
import {
  useDeleteUser,
  QueryKey as UserQueryKey,
} from "../../hooks/queries/users";
import type { User } from "../../types";
import { trackEvent } from "../../utils/analytics";
import { Alert } from "../library/Alert";
import { buttonClassName, ButtonSpinner } from "../library/Button";
import {
  form,
  formColumn,
  formControlClassName,
  formGroup,
  formLabel,
  formPage,
  formTitle,
} from "../library/Form";
import { link } from "../library/links";
import { modal, modalFooter, modalOverlay } from "../library/modal";

// The router state the home page gets after an account is deleted, so it can
// say so.
export interface AccountDeletedState {
  accountDeleted: true;
}

const text = "mx-0 mt-0 mb-15 text-14";

interface Props {
  onRequestClose: () => void;
  sessionUser: User;
}

// DeleteAccountModal is only mounted while it's open, so what was typed into
// it is gone the next time it opens.
export function DeleteAccountModal({ onRequestClose, sessionUser }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setToken } = useSession();
  const [confirmation, setConfirmation] = useState("");

  const deleteUserMutation = useDeleteUser();

  const { username } = sessionUser;
  const dexCount = sessionUser.dexes.length;
  const confirmed = confirmation === username;

  const handleConfirmationChange = (e: ChangeEvent<HTMLInputElement>) =>
    setConfirmation(e.target.value);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!confirmed || deleteUserMutation.isPending) {
      return;
    }

    try {
      await deleteUserMutation.mutateAsync({ username });
    } catch {
      // Since React Query catches the error and attaches it to the mutation, we
      // don't need to do anything with this error besides prevent it from
      // bubbling up.
      return;
    }

    trackEvent("User", "delete");
    // Signing out and leaving the account page happen in one render. The
    // router changes pages in a transition, so signing out on its own would
    // land first, and the account page would send a signed-out visitor to the
    // login page instead.
    const state: AccountDeletedState = { accountDeleted: true };
    startTransition(() => {
      navigate("/", { state });
      setToken(null);
    });
    // Nothing of the account is kept around to show again. Each key starts
    // with the username, so this covers all of its dexes and captures.
    queryClient.removeQueries({
      queryKey: [UserQueryKey.RetrieveUser, username],
    });
    queryClient.removeQueries({
      queryKey: [DexQueryKey.RetrieveDex, username],
    });
    queryClient.removeQueries({
      queryKey: [CaptureQueryKey.ListCaptures, username],
    });
  };

  return (
    <Modal
      className={modal}
      contentLabel="Delete Account"
      isOpen
      onRequestClose={onRequestClose}
      overlayClassName={modalOverlay}
    >
      <div className={formPage}>
        <h1 className={formTitle}>Delete Account</h1>
        <form className={`${form} ${formColumn}`} onSubmit={handleSubmit}>
          <Alert message={deleteUserMutation.error?.message} type="error" />
          <p className={text}>
            This permanently deletes the account{" "}
            <b className="font-bold wrap-break-word">{username}</b>, its
            profile,{" "}
            {dexCount === 1 ? "its dex" : `all ${dexCount} of its dexes`}, and
            every capture in {dexCount === 1 ? "it" : "them"}.
          </p>
          <p className={text}>
            Links to the profile and dexes will stop working.{" "}
            <b className="font-bold">
              This can&apos;t be undone, and we can&apos;t recover any of it for
              you.
            </b>
          </p>
          <div className={`${formGroup} mt-25`}>
            <label className={formLabel} htmlFor="delete_confirmation">
              Type{" "}
              <span className="wrap-break-word normal-case">{username}</span> to
              confirm
            </label>
            <input
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              className={formControlClassName()}
              id="delete_confirmation"
              name="delete_confirmation"
              onChange={handleConfirmationChange}
              spellCheck={false}
              type="text"
              value={confirmation}
            />
          </div>
          <button
            className={buttonClassName("red")}
            disabled={!confirmed || deleteUserMutation.isPending}
            type="submit"
          >
            <span className={deleteUserMutation.isPending ? "invisible" : ""}>
              Delete My Account
            </span>
            {deleteUserMutation.isPending ? <ButtonSpinner /> : null}
          </button>
        </form>
      </div>
      <p className={modalFooter}>
        {/* A button, so it can be reached with the keyboard, that looks like a
            link. Without preflight it starts with the browser's button look. */}
        <button
          className={`${link} border-0 bg-transparent p-0 font-primary text-14`}
          onClick={onRequestClose}
          type="button"
        >
          Go Back
        </button>
      </p>
    </Modal>
  );
}
