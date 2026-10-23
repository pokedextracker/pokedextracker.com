import type { ReactNode } from "react";

// Loading is a line in the middle of the page while it loads, or why it
// couldn't.
export function Loading({ children }: { children: ReactNode }) {
  return (
    <div className="mt-[47vh] text-center font-secondary text-11 font-bold tracking-1 text-heading uppercase">
      {children}
    </div>
  );
}
