import classNames from "classnames";
import type { ReactNode } from "react";

import { tw } from "../../utils/tw";

interface Props {
  className?: string;
  message: ReactNode;
  type: "error" | "success";
}

const types = {
  // In night mode the text is white, and an error keeps a red border.
  error: tw`border-danger text-error`,
  success: tw`border-success text-success`,
};

export function Alert({ className, message, type }: Props) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={classNames(
        "relative mb-20 border-2 border-solid p-11 text-center text-14 dark:bg-night-mode-02dp dark:text-white",
        types[type],
        className,
      )}
      data-testid={`alert-${type}`}
    >
      {message}
    </div>
  );
}
