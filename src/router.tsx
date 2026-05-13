import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AppShell } from "./components/AppShell";
import { LandingPage } from "./routes";
import { DashboardPage } from "./routes/dashboard";
import { NewBriefPage } from "./routes/briefs/new";
import { LoginPage } from "./routes/login";
import { RegisterPage } from "./routes/register";
import { AccountPage } from "./routes/account";
import { BriefRoutePage } from "./routes/briefs/$briefId";
import { BriefActionsRoutePage } from "./routes/briefs/$briefId.actions";
import { BriefGeneratedActionsRoutePage } from "./routes/briefs/$briefId.actions.generated";
import { SharedBriefRoutePage } from "./routes/briefs/$briefId.share";

const rootRoute = createRootRoute({
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const newBriefRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/briefs/new",
  component: NewBriefPage,
});

const briefRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/briefs/$briefId",
  component: BriefRoutePage,
});

const actionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/briefs/$briefId/actions",
  component: BriefActionsRoutePage,
});

const generatedActionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/briefs/$briefId/actions/generated",
  component: BriefGeneratedActionsRoutePage,
});

const sharedBriefRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/share/$briefId",
  component: SharedBriefRoutePage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account",
  component: AccountPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  newBriefRoute,
  briefRoute,
  actionsRoute,
  generatedActionsRoute,
  sharedBriefRoute,
  loginRoute,
  registerRoute,
  accountRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
