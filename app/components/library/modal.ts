import { tw } from "../../utils/tw";

// A modal over the page, and the shade behind it. A modal in night mode has
// the night-mode class itself, since it renders outside the app's root.
export const modal = tw`relative mx-auto my-[10vh] max-h-[80vh] w-500 overflow-y-scroll border-2 border-solid border-brand-secondary-light bg-white outline-none night:border-night-mode-secondary-dark night:bg-night-mode night:text-gray-medium max-550:mt-0 max-550:w-full`;
export const modalOverlay = tw`fixed inset-0 bg-[rgba(0,0,0,0.35)]`;

// The link under a modal's form that closes it.
export const modalFooter = tw`mt-0 text-center text-14`;
