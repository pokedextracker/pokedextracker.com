import { tw } from "../../utils/tw";

// A modal over the page, and the shade behind it.
export const modal = tw`relative mx-auto my-[10vh] max-h-[80vh] w-500 overflow-y-scroll border-2 border-solid border-brand-secondary-light bg-surface outline-none dark:border-night-mode-secondary-dark dark:text-gray-medium max-550:mt-0 max-550:w-full`;
export const modalOverlay = tw`fixed inset-0 bg-[rgba(0,0,0,0.35)]`;

// The link under a modal's form that closes it.
export const modalFooter = tw`mt-0 text-center text-14`;
