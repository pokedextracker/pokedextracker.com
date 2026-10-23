import { faLongArrowAltUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { MouseEventHandler } from "react";

export const SHOW_SCROLL_THRESHOLD = 400;

interface Props {
  onClick: MouseEventHandler<HTMLDivElement>;
  showScroll: boolean;
}

export function Scroll({ onClick, showScroll }: Props) {
  return (
    <div
      className={`fixed left-10 z-1 flex h-50 w-50 items-center justify-center rounded-half bg-brand-secondary text-11 text-white [box-shadow:var(--shadow-raised)] transition-all duration-500 ease-out hover:cursor-pointer hover:bg-brand-secondary-dark dark:bg-night-mode-06dp ${showScroll ? "bottom-10 opacity-100" : "-bottom-100 opacity-0"}`}
      onClick={onClick}
    >
      <FontAwesomeIcon icon={faLongArrowAltUp} />
    </div>
  );
}
