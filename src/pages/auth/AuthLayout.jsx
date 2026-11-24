import { FolderKanban, PieChart, ShieldCheck } from 'lucide-react'
import { Logo } from '../../components/layout/Logo.jsx'

const POINTS = [
  { icon: FolderKanban, title: 'Separate spaces', text: 'University, travel, family: every expense lives in exactly one project.' },
  { icon: PieChart, title: 'Clear answers', text: 'See where money went, what is left in each budget and how it changes.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Row-level security keeps your records visible to you alone.' },
]

// Decorative preview of the product, drawn with plain elements so it follows the theme.
function PreviewCard() {
  const bars = [38, 62, 45, 80, 56, 92, 70]
  return (
    <div className="relative mt-10 max-w-md rounded-3xl bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur-md" aria-hidden="true">
      <div className="flex items-center justify-between text-white">
        <div>
          <p className="text-xs text-white/70 uppercase">Net balance · This month</p>
          <p className="font-display mt-1 text-3xl font-bold">৳24,580</p>
        </div>
        <span className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-xs font-semibold text-emerald-200">+12%</span>
      </div>
      <div className="mt-5 flex h-24 items-end gap-2">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-t-lg bg-gradient-to-t from-white/25 to-white/70" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-white/85">
        {[['🎓', 'University'], ['✈️', "Cox's Bazar"], ['🏠', 'Personal']].map(([emoji, name]) => (
          <div key={name} className="truncate rounded-xl bg-white/10 px-2.5 py-2">{emoji} {name}</div>
        ))}
      </div>
    </div>
  )
}

export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="bg-hero relative isolate hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <svg className="absolute -right-32 -bottom-32 -z-10 size-[36rem] opacity-25" viewBox="0 0 200 200" aria-hidden="true">
          {[40, 60, 80, 99].map((r) => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="white" strokeOpacity=".5" strokeWidth=".5" />)}
        </svg>
        <span className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <span className="grid grid-cols-2 gap-0.5" aria-hidden="true">
              <span className="size-2 rounded-[3px] bg-white" />
              <span className="size-2 rounded-[3px] bg-white/55" />
              <span className="size-2 rounded-[3px] bg-white/55" />
              <span className="size-2 rounded-[3px] bg-emerald-300" />
            </span>
          </span>
          <span className="font-display text-lg font-bold">SpendSpace</span>
        </span>

        <div>
          <h2 className="font-display max-w-lg text-4xl leading-[1.1] font-extrabold tracking-tight xl:text-5xl">
            Every expense has its place.
          </h2>
          <PreviewCard />
          <ul className="mt-10 grid max-w-lg gap-5">
            {POINTS.map(({ icon: Icon, title: heading, text }) => (
              <li key={heading} className="flex gap-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/20">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{heading}</span>
                  <span className="block text-sm text-white/75">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/60">Manual tracking. No bank connections.</p>
      </section>

      <section className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="fade-up w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo tagline />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink lg:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-ink-2">{subtitle}</p>}
          <div className="mt-7 rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">{children}</div>
          {footer && <p className="mt-6 text-center text-sm text-ink-2">{footer}</p>}
        </div>
      </section>
    </main>
  )
}
