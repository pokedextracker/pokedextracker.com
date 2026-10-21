import { faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";

import { tw } from "../../utils/tw";

// Each color darkens on hover or focus: on devices without touch, or on any
// device in night mode.
const colors = {
  blue: tw`bg-brand-secondary-light text-white dark:bg-night-mode-secondary dark:hover:bg-night-mode-secondary-dark! dark:focus:bg-night-mode-secondary-dark! no-touch:hover:bg-brand-secondary no-touch:focus:bg-brand-secondary`,
  white: tw`bg-white text-brand-secondary dark:bg-gray-light dark:text-night-mode-secondary dark:hover:bg-gray-light-darken-6! dark:focus:bg-gray-light-darken-6! no-touch:hover:bg-white-darken-1 no-touch:focus:bg-white-darken-1`,
  yellow: tw`bg-brand-primary text-brand-secondary dark:bg-night-mode-primary dark:text-white dark:hover:bg-night-mode-primary-dark! dark:focus:bg-night-mode-primary-dark! no-touch:hover:bg-brand-primary-dark no-touch:focus:bg-brand-primary-dark`,
};

// A button's size and place: by default, as wide as what it's in.
export const buttonLayout = tw`block w-full p-15 text-11`;

// buttonClassName styles a link, button, or anything else as a button. Its
// layout replaces the default one rather than adding to it.
export function buttonClassName(
  color: keyof typeof colors,
  layout = buttonLayout,
): string {
  return classNames(
    "relative rounded-none border-0 font-secondary font-bold tracking-1 uppercase no-underline transition-all duration-100 ease-out no-touch:hover:cursor-pointer no-touch:focus:cursor-pointer",
    colors[color],
    layout,
  );
}

// The icon after a button's text, like its arrow.
export const buttonIcon = tw`ml-3 text-10 transition-all duration-100 ease-out`;

// ButtonSpinner spins over a button while what it does is pending. The
// button's text stays, hidden, so the button keeps its size.
export function ButtonSpinner() {
  return (
    <span className="absolute top-0 left-0 flex h-full w-full items-center justify-center">
      <FontAwesomeIcon
        className="text-10 transition-all duration-100 ease-out"
        icon={faCircleNotch}
        spin
      />
    </span>
  );
}
