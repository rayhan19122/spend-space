import '@fontsource-variable/inter'
import '@fontsource-variable/plus-jakarta-sans'
import './index.css'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ErrorBoundary } from './components/layout/ErrorBoundary.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { supabaseConfigProblem } from './lib/supabase.js'
import SetupRequiredPage from './pages/SetupRequiredPage.jsx'
import { endLocalSession } from './services/authService.js'
import { isSessionError } from './utils/errors.js'

// A request rejected for an expired session ends the session here too, which sends the user to
// the sign-in page and clears cached data, rather than leaving a page of errors.
const onDataError = (error) => {
  if (isSessionError(error)) endLocalSession()
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: onDataError }),
  mutationCache: new MutationCache({ onError: onDataError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (count, error) => !isSessionError(error) && count < 2,
    },
  },
})

const app = supabaseConfigProblem ? (
  <SetupRequiredPage problem={supabaseConfigProblem} />
) : (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>{app}</ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
