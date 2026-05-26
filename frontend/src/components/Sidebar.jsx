import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Package,
  CreditCard,
  Router as RouterIcon,
  ShieldAlert,
  Lock,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard'     },
  { to: '/customers',  icon: Users,           label: 'Customers'     },
  { to: '/packages',   icon: Package,         label: 'Packages'      },
  { to: '/payments',   icon: CreditCard,      label: 'Payments'      },
  { to: '/routers',    icon: RouterIcon,      label: 'Routers'       },
  { to: '/alerts',     icon: ShieldAlert,     label: 'Security Alerts' },
  { to: '/security',   icon: Lock,            label: 'Security Ops'  },
]

export default function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-ink-900/70 border-r border-white/[0.05] backdrop-blur-xl">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-accent flex items-center justify-center shadow-glow-cyan">
            <Lock className="w-4.5 h-4.5 text-ink-950" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display text-base font-bold text-white leading-none">Fiber Portal</div>
            <div className="text-[10px] uppercase tracking-widest text-ink-300 mt-1">Security Ops Console</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                 ${isActive
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-ink-200 hover:bg-white/[0.04] hover:text-white border border-transparent'
                 }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
              <span className="truncate">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* User box */}
      <div className="p-3 border-t border-white/[0.05]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03]">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-accent flex items-center justify-center text-ink-950 font-bold text-sm">
            {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">{user?.full_name || user?.username}</div>
            <div className="text-[11px] text-ink-300 truncate">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 rounded-md text-ink-300 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
