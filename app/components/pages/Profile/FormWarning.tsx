import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import type { ReactNode } from "react";

import { Tooltip } from "../../library/Tooltip";

interface Props {
  message: ReactNode;
}

export function FormWarning({ message }: Props) {
  if (!message) {
    return null;
  }

  // Beside the field rather than its whole group: the padding skips the
  // label's line and gap (formLabel's mb-8), so the warning centers on the
  // input.
  return (
    <div className="absolute bottom-0 -left-23 flex h-full items-center pt-22">
      <Tooltip
        className="ml-0"
        data-testid="form-warning"
        icon={faExclamationTriangle}
        iconClassName="text-10 text-red-500"
        textClassName="max-550:-ml-20 max-550:after:left-20"
        variant="error"
      >
        {message}
      </Tooltip>
    </div>
  );
}
