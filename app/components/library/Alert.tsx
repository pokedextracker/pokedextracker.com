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
  error: tw`border-danger text-red-500`,
  success: tw`border-green-500 text-green-500`,
};

export function Alert({ className, message, type }: Props) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={classNames(
        "relative mb-20 border-2 border-solid p-11 text-center text-14 dark:bg-night-02dp dark:text-white",
        types[type],
        className,
      )}
      data-testid={`alert-${type}`}
    >
      {message}
    </div>
  );
}
