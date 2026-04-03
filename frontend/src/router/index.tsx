import {
  lazy,
  Suspense,
  type ComponentType,
  type LazyExoticComponent,
} from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { PageSpinner } from "@/components/shared/Spinner";
import { RouteErrorPage } from "@/pages/RouteErrorPage";

const AppLayout = lazy(() =>
  import("@/components/layout/AppLayout").then((module) => ({
    default: module.AppLayout,
  })),
);
const LoginPage = lazy(() =>
  import("@/pages/LoginPage").then((module) => ({ default: module.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("@/pages/RegisterPage").then((module) => ({
    default: module.RegisterPage,
  })),
);
const BootstrapPage = lazy(() =>
  import("@/pages/BootstrapPage").then((module) => ({
    default: module.BootstrapPage,
  })),
);
const AcceptInvitePage = lazy(() =>
  import("@/pages/AcceptInvitePage").then((module) => ({
    default: module.AcceptInvitePage,
  })),
);
const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const ProfilePage = lazy(() =>
  import("@/pages/ProfilePage").then((module) => ({
    default: module.ProfilePage,
  })),
);
const UsersPage = lazy(() =>
  import("@/pages/UsersPage").then((module) => ({ default: module.UsersPage })),
);
const TeamsPage = lazy(() =>
  import("@/pages/TeamsPage").then((module) => ({ default: module.TeamsPage })),
);
const TeamDetailPage = lazy(() =>
  import("@/pages/TeamDetailPage").then((module) => ({
    default: module.TeamDetailPage,
  })),
);
const EventDetailPage = lazy(() =>
  import("@/pages/EventDetailPage").then((module) => ({
    default: module.EventDetailPage,
  })),
);
const EventsPage = lazy(() =>
  import("@/pages/EventsPage").then((module) => ({
    default: module.EventsPage,
  })),
);
const OfferingsPage = lazy(() =>
  import("@/pages/OfferingsPage").then((module) => ({
    default: module.OfferingsPage,
  })),
);
const InteractionTypesPage = lazy(() =>
  import("@/pages/InteractionTypesPage").then((module) => ({
    default: module.InteractionTypesPage,
  })),
);
const BookingsPage = lazy(() =>
  import("@/pages/BookingsPage").then((module) => ({
    default: module.BookingsPage,
  })),
);
const PublicBookingPage = lazy(() =>
  import("@/pages/public/PublicBookingPage").then((module) => ({
    default: module.PublicBookingPage,
  })),
);

import { PublicLayout } from "@/components/layout/PublicLayout";

// Helper to render a lazy-loaded page with a fallback spinner
// This ensures a consistent loading experience across all routes

function renderLazyPage(Page: LazyExoticComponent<ComponentType>) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Page />
    </Suspense>
  );
}

function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: renderLazyPage(LoginPage),
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/register",
    element: renderLazyPage(RegisterPage),
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/bootstrap",
    element: renderLazyPage(BootstrapPage),
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/accept-invite",
    element: renderLazyPage(AcceptInvitePage),
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/book",
    element: <PublicLayout />,
    children: [
      { path: "", element: renderLazyPage(PublicBookingPage) },
      { path: "team/:teamSlug", element: renderLazyPage(PublicBookingPage) },
      { path: "event/:eventSlug", element: renderLazyPage(PublicBookingPage) },
      { path: "coach/:coachSlug", element: renderLazyPage(PublicBookingPage) },
    ],
  },

  {
    element: <AuthGuard />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: renderLazyPage(AppLayout),
        errorElement: <RouteErrorPage />,
        children: [
          { path: "/", element: <Navigate to="/dashboard" replace /> },
          { path: "/dashboard", element: renderLazyPage(DashboardPage) },
          { path: "/profile", element: renderLazyPage(ProfilePage) },
          { path: "/users", element: renderLazyPage(UsersPage) },
          { path: "/teams", element: renderLazyPage(TeamsPage) },
          { path: "/events", element: renderLazyPage(EventsPage) },
          { path: "/teams/:teamId", element: renderLazyPage(TeamDetailPage) },
          {
            path: "/events/:eventId",
            element: renderLazyPage(EventDetailPage),
          },
          { path: "/event-offerings", element: renderLazyPage(OfferingsPage) },
          {
            path: "/interaction-types",
            element: renderLazyPage(InteractionTypesPage),
          },
          { path: "/bookings", element: renderLazyPage(BookingsPage) },
        ],
      },
    ],
  },
]);
