import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

import type { ReactNode } from 'react';

interface Props {
  message: ReactNode;
}

export function FormWarning ({ message }: Props) {
  if (!message) {
    return null;
  }

  return (
    <div className="form-warning">
      <div className="tooltip">
        <FontAwesomeIcon icon={faExclamationTriangle} />
        <span className="tooltip-text">{message}</span>
      </div>
    </div>
  );
}
