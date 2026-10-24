import { tw } from "../../utils/tw";

// A page under the nav, which fills the rest of the window, so what scrolls
// is inside it. A printout is as long as the page, and plain blocks rather
// than flex containers, which some browsers cut off at the first printed
// page.
export const pageContainer = tw`flex min-h-0 flex-[1_1_auto] flex-col print:block`;

// The column a profile or dex sits in: six boxes wide, or the whole width on
// a narrow screen.
export const wrapper = tw`mx-auto my-0 w-662 max-750:w-full`;
