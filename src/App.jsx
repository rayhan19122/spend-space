import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell.jsx'
import { FullPageLoader, ProtectedRoute, PublicOnlyRoute } from './components/layout/RouteGuards.jsx'

const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'))
const SignupPage = lazy(() => import('./pages/auth/SignupPage.jsx'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage.jsx'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage.jsx'))
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage.jsx'))
const ProjectLayout = lazy(() => import('./pages/project/ProjectLayout.jsx'))
const ProjectOverviewPage = lazy(() => import('./pages/project/ProjectOverviewPage.jsx'))
const ProjectTransactionsPage = lazy(() => import('./pages/project/ProjectTransactionsPage.jsx'))
const ProjectCategoriesPage = lazy(() => import('./pages/project/ProjectCategoriesPage.jsx'))
const ProjectBudgetsPage = lazy(() => import('./pages/project/ProjectBudgetsPage.jsx'))
const ProjectReportsPage = lazy(() => import('./pages/project/ProjectReportsPage.jsx'))
const ProjectSettingsPage = lazy(() => import('./pages/project/ProjectSettingsPage.jsx'))
const TransactionsPage = lazy(() => import('./pages/TransactionsPage.jsx'))
const RecurringPage = lazy(() => import('./pages/RecurringPage.jsx'))
const BudgetsPage = lazy(() => import('./pages/BudgetsPage.jsx'))
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx'))
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))

export default function App() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route path="reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:projectId" element={<ProjectLayout />}>
              <Route index element={<ProjectOverviewPage />} />
              <Route path="transactions" element={<ProjectTransactionsPage />} />
              <Route path="categories" element={<ProjectCategoriesPage />} />
              <Route path="budgets" element={<ProjectBudgetsPage />} />
              <Route path="reports" element={<ProjectReportsPage />} />
              <Route path="settings" element={<ProjectSettingsPage />} />
              <Route path="*" element={<Navigate to="." replace />} />
            </Route>
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="recurring" element={<RecurringPage />} />
            <Route path="budgets" element={<BudgetsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
