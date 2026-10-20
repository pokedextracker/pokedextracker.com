import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";

import { useVersion } from "../../hooks/queries/version";

export function Reload() {
  const { data: version } = useVersion();
  // The version this tab loaded with. When /version starts answering with
  // something else, a new build is out.
  const [firstVersion, setFirstVersion] = useState<string | null>(
    version || null,
  );
  if (!firstVersion && version) {
    setFirstVersion(version);
  }
  const shouldReload = firstVersion && firstVersion !== version;

  if (!shouldReload) {
    return null;
  }

  const handleClick = () => window.location.reload();

  return (
    <div className="reload" data-testid="reload-banner">
      <FontAwesomeIcon icon={faExclamationCircle} />
      There&apos;s a new version of the app available &ndash;{" "}
      <a className="link" onClick={handleClick}>
        Refresh your browser
      </a>{" "}
      now!
    </div>
  );
}
