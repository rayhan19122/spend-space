import { AlertTriangle } from 'lucide-react'
import { Logo } from '../components/layout/Logo.jsx'

const MESSAGES = {
  missing: {
    title: 'Connect SpendSpace to Supabase',
    body: 'The app needs VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env, fill in both values from your Supabase project, then restart the dev server. On Vercel, add them under Project Settings → Environment Variables and redeploy.',
  },
  'secret-key': {
    title: 'A secret key was detected',
    body: 'The configured key can bypass all security rules and must never reach a browser, so the app has refused to start. Replace it with your publishable key, and rotate the secret key in Supabase if this build was ever deployed.',
  },
}

export default function SetupRequiredPage({ problem }) {
  const { title, body } = MESSAGES[problem]
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo tagline /></div>
        <div className="liquid rounded-3xl p-6">
          <AlertTriangle className="mb-3 size-6 text-warning" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-ink">{title}</h1>
          <p className="mt-2 text-sm text-ink-2">{body}</p>
          <p className="mt-3 text-sm text-ink-2">Step-by-step instructions are in docs/SUPABASE_SETUP.md.</p>
        </div>
      </div>
    </main>
  )
}
