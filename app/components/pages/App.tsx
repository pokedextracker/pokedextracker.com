import { getCurrentScope } from "@sentry/react";
import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";

import { ReloadOnNavigation } from "../library/Reload";
import { Account } from "./Account";
import { Home } from "./Home";
import { Login } from "./Login";
import { NotFound } from "./NotFound";
import { Profile } from "./Profile";
import { ProfileRedirect } from "./ProfileRedirect";
import { Register } from "./Register";
import { Tracker } from "./Tracker";

// ErrorReportPage tags error reports with the page they happened on.
function ErrorReportPage() {
  const { pathname } = useLocation();

  useEffect(() => {
    getCurrentScope().setTransactionName(pathname);
  }, [pathname]);

  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <ErrorReportPage />
      <ReloadOnNavigation />
      <div className="flex h-screen flex-col print:block print:h-auto">
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
