import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Menu,
  X,
  Lock,
  LayoutDashboard,
  Users,
  Package,
  CreditCard,
  Router as RouterIcon,
  ShieldAlert,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/customers',  icon: Users,           label: 'Customers' },
  { to: '/packages',   icon: Package,         label: 'Packages' },
  { to: '/payments',   icon: CreditCard,      label: 'Payments' },
  { to: '/routers',    icon: RouterIcon,      label: 'Routers' },
  { to: '/alerts',     icon: ShieldAlert,     label: 'Alerts' },
  { to: '/security',   icon: Lock,            label: 'Security Ops' },
]

const pageTitles = {
  '/':          { title: 'Dashboard',       subtitle: 'Real-time overview of your network' },
  '/customers': { title: 'Customers',       subtitle: 'Manage fiber subscribers' },
  '/packages':  { title: 'Packages',        subtitle: 'Internet plans and pricing' },
  '/payments':  { title: 'Payments',        subtitle: 'Billing records and revenue' },
  '/routers':   { title: 'Routers',         subtitle: 'Network equipment monitoring' },
  '/alerts':    { title: 'Security Alerts', subtitle: 'Incidents and intrusion events' },
  '/security':  { title: 'Security Ops',    subtitle: 'MAC verification, IDS, port scanning' },
}

export default function Topbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()
  const location = useLocation()
  const meta = pageTitles[location.pathname] || { title: 'Fiber Portal', subtitle: '' }

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-4 bg-ink-950/70 backdrop-blur-xl border-b border-white/[0.05]">
        {/* Left — page title or mobile menu */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg text-ink-200 hover:bg-white/[0.05] transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-xl font-bold text-white truncate">{meta.title}</h1>
            {meta.subtitle && <p className="text-xs text-ink-300 truncate hidden sm:block">{meta.subtitle}</p>}
          </div>
        </div>

        {/* Right — search shortcut + user (placeholder) */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-ink-300">
            <span className="glow-dot bg-emerald-400" />
            <span className="font-mono">SYSTEM ONLINE</span>
          </div>
          <div className="lg:hidden w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-accent flex items-center justify-center text-ink-950 font-bold text-xs">
            {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 bottom-0 w-72 bg-ink-900 border-r border-white/[0.05] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-accent flex items-center justify-center">
                  <Lock className="w-4.5 h-4.5 text-ink-950" strokeWidth={2.5} />
                </div>
                <div className="font-display font-bold text-white">Fiber Portal</div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-md text-ink-200 hover:bg-white/[0.05]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                       ${isActive ? 'bg-accent/10 text-accent' : 'text-ink-200 hover:bg-white/[0.04]'}`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                )
              })}
            </nav>

            <button
              onClick={() => { setMobileOpen(false); logout() }}
              className="m-3 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-300 hover:bg-rose-500/10 transition-colors border border-rose-500/20"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </aside>
        </div>
      )}
    </>
  )
}
