import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useMemo, useState } from 'react';

import { useVersion } from '../../hooks/queries/version';

export function Reload () {
  const { data: version } = useVersion();
  const [firstVersion, setFirstVersion] = useState<string | null>(version || null);
  const shouldReload = useMemo(() => firstVersion && firstVersion !== version, [firstVersion, version]);

  useEffect(() => {
    if (!firstVersion && version) {
      setFirstVersion(version);
    }
  }, [version, firstVersion]);

  if (!shouldReload) {
    return null;
  }

  const handleClick = () => window.location.reload();

  return (
    <div className="reload">
      <FontAwesomeIcon icon={faExclamationCircle} />
      There&apos;s a new version of the app available &ndash; <a className="link" onClick={handleClick}>Refresh your browser</a> now!
    </div>
  );
}
