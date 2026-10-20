// A link's color, which darkens on hover or focus. Night mode has its own
// color, which darkens on hover; on focus it takes the day's darker color.
export const linkColor =
  "cursor-pointer text-brand-secondary-light transition-all duration-100 ease-out hover:text-brand-secondary-dark focus:text-brand-secondary-dark night:text-night-mode-link night:hover:text-night-mode-link-dark";

// A link in a line of text.
export const link = `${linkColor} font-medium underline`;
