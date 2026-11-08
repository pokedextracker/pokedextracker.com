import {
  faExclamationCircle,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { useTrackerContext } from "./use-tracker";

// SaveError is a banner under the nav, like the one for a new version, saying
// why marking couldn't be saved. Several failures in a row show it once.
export function SaveError() {
  const { saveError, setSaveError } = useTrackerContext();

  if (!saveError) {
    return null;
  }

  return (
    <div
      className="relative bg-yellow-50 px-40 py-10 text-center text-14 dark:bg-night-24dp print:hidden"
      data-testid="save-error-banner"
      role="alert"
    >
      <FontAwesomeIcon className="mr-2 text-10" icon={faExclamationCircle} />
      {saveError}
      <button
        aria-label="Close"
        className="absolute top-1/2 right-12 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-8 text-12 text-gray-400 transition-all duration-100 ease-out hover:text-gray-600 dark:hover:text-white"
        onClick={() => setSaveError(null)}
        type="button"
      >
        <FontAwesomeIcon icon={faTimes} />
      </button>
    </div>
  );
}
