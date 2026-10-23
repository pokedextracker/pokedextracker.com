import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import type { ReactNode } from "react";

import { tw } from "../../utils/tw";

// Where the text sits and its colors, with its arrow's to match.
const variants = {
  default: tw`bottom-27 bg-brand-secondary text-white after:top-full after:border-t-brand-secondary`,
  // In night mode it takes night mode's red.
  error: tw`bottom-27 bg-error-darken-5 text-white after:top-full after:border-t-error-darken-5 dark:bg-night-mode-error dark:after:border-t-night-mode-error`,
  light: tw`bottom-27 bg-white text-black after:top-full after:border-t-white`,
  // Below the trigger, in the nav's colors in night mode.
  nav: tw`top-47 bg-brand-secondary text-white after:bottom-full after:border-b-brand-secondary dark:bg-night-mode-primary dark:text-night-mode-03dp dark:after:border-b-night-mode-primary`,
};

type Variant = keyof typeof variants;

interface TextProps {
  children: ReactNode;
  className?: string;
  variant?: Variant;
}

// TooltipText is the text that shows while its trigger is hovered. The
// trigger needs the group class and a position for the text to sit against.
export function TooltipText({
  children,
  className,
  variant = "default",
}: TextProps) {
  return (
    <span
      className={classNames(
        "invisible absolute left-1/2 z-1 -ml-60 w-120 rounded-5 p-5 text-center text-13 font-normal group-hover:visible",
        "after:absolute after:left-1/2 after:-ml-5 after:border-5 after:border-solid after:border-transparent",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

interface Props {
  children: ReactNode;
  // Where the tooltip sits, which is 3px from what's before it by default.
  className?: string;
  "data-testid"?: string;
  icon: IconDefinition;
  // The icon's size and color: 11px and the surrounding text's by default.
  iconClassName?: string;
  textClassName?: string;
  variant?: Variant;
}

// Tooltip is an icon that shows some text on hover.
export function Tooltip({
  children,
  className = tw`ml-3`,
  "data-testid": testId,
  icon,
  iconClassName = tw`text-11`,
  textClassName,
  variant,
}: Props) {
  return (
    <div
      className={classNames("group relative inline-block", className)}
      data-testid={testId}
    >
      <FontAwesomeIcon className={iconClassName} icon={icon} />
      <TooltipText className={textClassName} variant={variant}>
        {children}
      </TooltipText>
    </div>
  );
}
