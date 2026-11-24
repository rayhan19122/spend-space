import { FolderKanban, LayoutDashboard, PieChart, Receipt, Repeat, Settings, Target } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/budgets', label: 'Budgets', icon: Target },
  { to: '/reports', label: 'Reports', icon: PieChart },
  { to: '/settings', label: 'Settings', icon: Settings },
]

// Shown in the phone "More" sheet. Recurring rules are reached from Transactions on desktop.
export const MORE_ITEMS = [
  { to: '/budgets', label: 'Budgets', icon: Target },
  { to: '/reports', label: 'Reports', icon: PieChart },
  { to: '/recurring', label: 'Recurring rules', icon: Repeat },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const TITLES = [
  ['/projects', 'Projects'],
  ['/transactions', 'Transactions'],
  ['/recurring', 'Recurring rules'],
  ['/budgets', 'Budgets'],
  ['/reports', 'Reports'],
  ['/settings', 'Settings'],
]

export const pageTitle = (pathname) =>
  TITLES.find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1] ?? 'Dashboard'
