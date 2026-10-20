import "./styles/tailwind.css";
import "./styles";

import { config as fontAwesome } from "@fortawesome/fontawesome-svg-core";
import { ErrorBoundary, Provider as RollbarProvider } from "@rollbar/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import Modal from "react-modal";

import { App } from "./components/pages/App";
import { LocalStorageContextProvider } from "./hooks/contexts/use-local-storage-context";
import { SessionProvider } from "./hooks/contexts/use-session";
import { queryClient } from "./utils/query-client";
import { Rollbar } from "./utils/rollbar";

// Font Awesome's stylesheet is in styles/index.scss, so the site's styles can
// still override it from inside a CSS layer. Left to add it itself, it would
// sit outside every layer and win over them.
fontAwesome.autoAddCss = false;

Modal.setAppElement("#root");

function run() {
  createRoot(document.getElementById("root")!).render(
    <RollbarProvider instance={Rollbar}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <LocalStorageContextProvider>
              <App />
            </LocalStorageContextProvider>
          </SessionProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </RollbarProvider>,
  );
}

if (document.getElementById("root")) {
  run();
} else {
  window.addEventListener("DOMContentLoaded", run);
}
