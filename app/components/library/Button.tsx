import { faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";

// Each color darkens on hover or focus: on devices without touch, or on any
// device in night mode.
const colors = {
  blue: "bg-brand-secondary-light text-white no-touch:hover:bg-brand-secondary no-touch:focus:bg-brand-secondary night:bg-night-mode-secondary night:hover:bg-night-mode-secondary-dark night:focus:bg-night-mode-secondary-dark",
  white:
    "bg-white text-brand-secondary no-touch:hover:bg-white-darken-1 no-touch:focus:bg-white-darken-1 night:bg-gray-light night:text-night-mode-secondary night:hover:bg-gray-light-darken-6 night:focus:bg-gray-light-darken-6",
  yellow:
    "bg-brand-primary text-brand-secondary no-touch:hover:bg-brand-primary-dark no-touch:focus:bg-brand-primary-dark night:bg-night-mode-primary night:text-white night:hover:bg-night-mode-primary-dark night:focus:bg-night-mode-primary-dark",
};

// A button's size and place: by default, as wide as what it's in.
export const buttonLayout = "block w-full p-15 text-11";

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
export const buttonIcon = "ml-3 text-10 transition-all duration-100 ease-out";

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
