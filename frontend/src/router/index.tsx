import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/auth/useAuth'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { RouteErrorPage } from '@/pages/RouteErrorPage'

const AppLayout = lazy(() =>
  import('@/components/layout/AppLayout').then((module) => ({
    default: module.AppLayout,
  }))
)
const LoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then((module) => ({ default: module.LoginPage }))
)
const RegisterPage = lazy(() =>
  import('@/pages/auth/RegisterPage').then((module) => ({
    default: module.RegisterPage,
  }))
)
const BootstrapPage = lazy(() =>
  import('@/pages/auth/BootstrapPage').then((module) => ({
    default: module.BootstrapPage,
  }))
)
const AcceptInvitePage = lazy(() =>
  import('@/pages/auth/AcceptInvitePage').then((module) => ({
    default: module.AcceptInvitePage,
  }))
)
const SsoErrorPage = lazy(() =>
  import('@/pages/auth/SsoErrorPage').then((module) => ({
    default: module.SsoErrorPage,
  }))
)
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  }))
)
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((module) => ({
    default: module.ProfilePage,
  }))
)
const UsersPage = lazy(() =>
  import('@/pages/UsersPage').then((module) => ({ default: module.UsersPage }))
)
const TeamsPage = lazy(() =>
  import('@/pages/TeamsPage').then((module) => ({ default: module.TeamsPage }))
)
const TeamDetailPage = lazy(() =>
  import('@/pages/TeamDetailPage').then((module) => ({
    default: module.TeamDetailPage,
  }))
)
const EventDetailPage = lazy(() =>
  import('@/pages/EventDetailPage').then((module) => ({
    default: module.EventDetailPage,
  }))
)
const EventsPage = lazy(() =>
  import('@/pages/EventsPage').then((module) => ({
    default: module.EventsPage,
  }))
)
const EventTypesPage = lazy(() =>
  import('@/pages/EventTypesPage').then((module) => ({
    default: module.EventTypesPage,
  }))
)
const InteractionTypesPage = lazy(() =>
  import('@/pages/InteractionTypesPage').then((module) => ({
    default: module.InteractionTypesPage,
  }))
)
const BookingsPage = lazy(() =>
  import('@/pages/BookingsPage').then((module) => ({
    default: module.BookingsPage,
  }))
)
const PublicBookingPage = lazy(() =>
  import('@/pages/public/PublicBookingPage').then((module) => ({
    default: module.PublicBookingPage,
  }))
)
const PublicBookingPageDirectory = lazy(() =>
  import('@/pages/public/PublicBookingPageDirectory').then((module) => ({
    default: module.PublicBookingPageDirectory,
  }))
)
const SessionTypesPage = lazy(() =>
  import('@/pages/SessionTypesPage').then((module) => ({
    default: module.SessionTypesPage,
  }))
)
const BookingPagesPage = lazy(() =>
  import('@/pages/BookingPagesPage').then((module) => ({
    default: module.BookingPagesPage,
  }))
)
const StudentsPage = lazy(() =>
  import('@/pages/StudentsPage').then((module) => ({
    default: module.StudentsPage,
  }))
)
const StudentDetailPage = lazy(() =>
  import('@/pages/StudentDetailPage').then((module) => ({
    default: module.StudentDetailPage,
  }))
)
const PublicReschedulePage = lazy(() =>
  import('@/pages/public/PublicReschedulePage').then((module) => ({
    default: module.PublicReschedulePage,
  }))
)
const PublicCancelPage = lazy(() =>
  import('@/pages/public/PublicCancelPage').then((module) => ({
    default: module.PublicCancelPage,
  }))
)
const ReportsPage = lazy(() =>
  import('@/pages/ReportsPage').then((module) => ({
    default: module.ReportsPage,
  }))
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  }))
)

import { PublicLayout } from '@/components/layout/PublicLayout'

// Helper to render a lazy-loaded page with a fallback spinner
// This ensures a consistent loading experience across all routes

function renderLazyPage(Page: LazyExoticComponent<ComponentType>) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Page />
    </Suspense>
  )
}

function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <PageSpinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: renderLazyPage(LoginPage),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/register',
    element: renderLazyPage(RegisterPage),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/bootstrap',
    element: renderLazyPage(BootstrapPage),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/accept-invite',
    element: renderLazyPage(AcceptInvitePage),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/sso/error',
    element: renderLazyPage(SsoErrorPage),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/book',
    element: <PublicLayout maxWidth="lg" />,
    children: [
      { path: '', element: renderLazyPage(PublicBookingPageDirectory) },
      { path: 'page/:pageSlug', element: renderLazyPage(PublicBookingPageDirectory) },
      { path: 'team/:teamSlug', element: renderLazyPage(PublicBookingPage) },
      { path: 'event/:eventSlug', element: renderLazyPage(PublicBookingPage) },
      { path: 'coach/:coachSlug', element: renderLazyPage(PublicBookingPage) },
      { path: 'group/:groupSlug', element: renderLazyPage(PublicBookingPage) },
    ],
  },
  {
    path: '/reschedule/:bookingId',
    element: <PublicLayout maxWidth="lg" />,
    children: [{ path: '', element: renderLazyPage(PublicReschedulePage) }],
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/cancel/:bookingId',
    element: <PublicLayout maxWidth="lg" />,
    children: [{ path: '', element: renderLazyPage(PublicCancelPage) }],
    errorElement: <RouteErrorPage />,
  },

  {
    element: <AuthGuard />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: renderLazyPage(AppLayout),
        errorElement: <RouteErrorPage />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: renderLazyPage(DashboardPage) },
          { path: '/profile', element: renderLazyPage(ProfilePage) },
          { path: '/users', element: renderLazyPage(UsersPage) },
          { path: '/teams', element: renderLazyPage(TeamsPage) },
          { path: '/events', element: renderLazyPage(EventsPage) },
          { path: '/teams/:teamId', element: renderLazyPage(TeamDetailPage) },
          {
            path: '/events/:eventId',
            element: renderLazyPage(EventDetailPage),
          },
          { path: '/event-types', element: renderLazyPage(EventTypesPage) },
          {
            path: '/interaction-types',
            element: renderLazyPage(InteractionTypesPage),
          },
          { path: '/bookings', element: renderLazyPage(BookingsPage) },
          { path: '/reports', element: renderLazyPage(ReportsPage) },
          { path: '/students', element: renderLazyPage(StudentsPage) },

          { path: '/students/:studentId', element: renderLazyPage(StudentDetailPage) },
          { path: '/session-types', element: renderLazyPage(SessionTypesPage) },
          { path: '/booking-pages', element: renderLazyPage(BookingPagesPage) },
        ],
      },
    ],
  },
  {
    path: '*',
    element: renderLazyPage(NotFoundPage),
  },
])
