import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";

import { useVersion } from "../../hooks/queries/version";
import { link } from "./links";

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
    <div
      className="bg-yellow-50 px-30 py-10 text-center text-14 dark:bg-night-24dp"
      data-testid="reload-banner"
    >
      <FontAwesomeIcon className="mr-2 text-10" icon={faExclamationCircle} />
      There&apos;s a new version of the app available &ndash;{" "}
      <a className={link} onClick={handleClick}>
        Refresh your browser
      </a>{" "}
      now!
    </div>
  );
}
