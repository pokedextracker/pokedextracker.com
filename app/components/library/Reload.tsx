import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useIsMutating } from "@tanstack/react-query";
import { useEffect, useRef, type MouseEvent } from "react";
import { useLocation } from "react-router";

import { useNewBuildIsOut } from "../../hooks/queries/version";
import { link } from "./links";

// ReloadOnNavigation moves the tab onto a new build at the next page change,
// with a full page load in place of the in-app one. Someone who's left what
// they were doing loses nothing, and the banner (Reload) stays for anyone who
// doesn't move. A save still in flight, like a capture toggled just before the
// click, finishes first, since a reload would cancel it.
export function ReloadOnNavigation() {
  const newBuildIsOut = useNewBuildIsOut();
  const saving = useIsMutating() > 0;
  const { pathname } = useLocation();
  // The page the tab was on when it learned of the new build. Leaving it is
  // the cue (a search or hash change stays on the page), and it still counts
  // if they come back before a save finishes.
  const pathnameWhenOut = useRef<string | null>(null);
  const leftThePage = useRef(false);

  useEffect(() => {
    if (!newBuildIsOut) {
      pathnameWhenOut.current = null;
      leftThePage.current = false;
      return;
    }
    if (pathnameWhenOut.current === null) {
      pathnameWhenOut.current = pathname;
    }
    if (pathname !== pathnameWhenOut.current) {
      leftThePage.current = true;
    }
    if (leftThePage.current && !saving) {
      window.location.reload();
    }
  }, [newBuildIsOut, pathname, saving]);

  return null;
}

export function Reload() {
  const newBuildIsOut = useNewBuildIsOut();
  const { hash, pathname, search } = useLocation();

  if (!newBuildIsOut) {
    return null;
  }

  // The link points at this page, so it can be reached from the keyboard and
  // wraps with the text (a button can't). The click reloads instead of
  // following it, which keeps the page's scroll position like a refresh.
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.location.reload();
  };

  return (
    <div
      className="bg-yellow-50 px-30 py-10 text-center text-14 dark:bg-night-24dp"
      data-testid="reload-banner"
    >
      <FontAwesomeIcon className="mr-2 text-10" icon={faExclamationCircle} />
      There&apos;s a new version of the app available &ndash;{" "}
      <a
        className={link}
        href={`${pathname}${search}${hash}`}
        onClick={handleClick}
      >
        Refresh your browser
      </a>{" "}
      now!
    </div>
  );
}
