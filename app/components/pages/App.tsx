import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";

import { Rollbar } from "../../utils/rollbar";
import { ReloadOnNavigation } from "../library/Reload";
import { Account } from "./Account";
import { Home } from "./Home";
import { Login } from "./Login";
import { NotFound } from "./NotFound";
import { Profile } from "./Profile";
import { ProfileRedirect } from "./ProfileRedirect";
import { Register } from "./Register";
import { Tracker } from "./Tracker";

// RollbarContext tags error reports with the page they happened on.
function RollbarContext() {
  const { pathname } = useLocation();

  useEffect(() => {
    Rollbar.configure({ payload: { context: pathname } });
  }, [pathname]);

  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <RollbarContext />
      <ReloadOnNavigation />
      <div className="flex h-screen flex-col print:block print:h-auto">
        {/* The server gives each of these routes its own title and search
            tags, and a 404 to anything else (pkg/server/pages.go), so a new
            route needs adding there too. */}
        <Routes>
          <Route element={<Home />} path="/" />
          <Route element={<Login />} path="/login" />
          <Route element={<Register />} path="/register" />
          <Route element={<Account />} path="/account" />
          <Route element={<ProfileRedirect />} path="/profile" />
          <Route element={<Profile />} path="/u/:username" />
          <Route element={<Tracker />} path="/u/:username/:slug" />
          <Route element={<NotFound />} path="*" />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
