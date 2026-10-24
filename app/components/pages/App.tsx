import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";

import { Rollbar } from "../../utils/rollbar";
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
