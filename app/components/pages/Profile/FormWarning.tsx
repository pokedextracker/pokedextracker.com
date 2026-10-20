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

  return (
    <div className="form-warning">
      <Tooltip
        className="ml-0"
        data-testid="form-warning"
        icon={faExclamationTriangle}
        iconClassName="text-10 text-error"
        textClassName="max-550:-ml-20 max-550:after:left-20"
        variant="error"
      >
        {message}
      </Tooltip>
    </div>
  );
}
