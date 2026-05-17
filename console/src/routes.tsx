import type { ReactElement } from "react";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";

export interface AppRoute {
  path: string;
  element: ReactElement;
}

export const AUTH_CALLBACK_PATH = "/auth/callback";

const routes: Record<string, AppRoute> = {
  dashboard: { path: "/", element: <DashboardPage /> },
  settings: { path: "/settings", element: <SettingsPage /> },
  authCallback: { path: AUTH_CALLBACK_PATH, element: <AuthCallbackPage /> },
};

export default routes;
