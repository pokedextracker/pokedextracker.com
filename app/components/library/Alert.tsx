import classNames from 'classnames';

import type { ReactNode } from 'react';

interface Props {
  className?: string;
  message: ReactNode;
  type: 'error' | 'success';
}

export function Alert ({ className, message, type }: Props) {
  if (!message) {
    return null;
  }

  return (
    <div className={classNames('alert', `alert-${type}`, className)}>
      {message}
    </div>
  );
}
