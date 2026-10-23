import { tw } from "../../utils/tw";

// A link's color, which darkens on hover or focus.
export const linkColor = tw`cursor-pointer text-link transition-all duration-100 ease-out hover:text-link-hover focus:text-link-hover`;

// A link in a line of text.
export const link = tw`${linkColor} font-medium underline`;
