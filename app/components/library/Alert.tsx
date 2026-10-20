import classNames from "classnames";
import type { ReactNode } from "react";

interface Props {
  className?: string;
  message: ReactNode;
  type: "error" | "success";
}

const types = {
  // In night mode the text is white, and an error keeps a red border.
  error: "border-error text-error night:border-night-mode-error",
  success: "border-success text-success",
};

export function Alert({ className, message, type }: Props) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={classNames(
        "relative mb-20 border-2 border-solid p-11 text-center text-14 night:bg-night-mode-02dp night:text-white",
        types[type],
        className,
      )}
      data-testid={`alert-${type}`}
    >
      {message}
    </div>
  );
}
