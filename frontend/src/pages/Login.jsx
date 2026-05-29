import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Lock, ShieldCheck, Activity, Radio } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    try {
      await login(username.trim(), password)
    } catch (err) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-5">
      {/* ===== Left — branded panel ===== */}
      <div className="hidden lg:flex lg:col-span-3 relative overflow-hidden bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950">
        <div className="absolute inset-0 grid-overlay opacity-50" />
        <div className="absolute inset-0 bg-aurora" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full border border-cyan-500/10" />
        <div className="absolute -bottom-32 -left-32 w-[480px] h-[480px] rounded-full border border-cyan-500/15" />
        <div className="absolute -bottom-20 -left-20 w-[320px] h-[320px] rounded-full border border-accent/20" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-accent flex items-center justify-center shadow-glow-cyan">
              <Lock className="w-5 h-5 text-ink-950" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display text-xl font-bold text-white">Fiber Security Portal</div>
              <div className="text-xs text-ink-300 mt-0.5 uppercase tracking-widest">ISP Management Console</div>
            </div>
          </div>

          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-mono mb-5">
              <span className="glow-dot bg-accent" /> SECURE • MONITORED • REAL-TIME
            </div>
            <h2 className="font-display text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
              Manage your <span className="text-gradient">fiber network</span> with confidence.
            </h2>
            <p className="text-ink-300 mt-5 text-lg leading-relaxed max-w-md">
              Customers, packages, billing, routers and intrusion detection — all in one elegant operations console.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: ShieldCheck, label: 'Intrusion Detection', value: 'IDS + Brute-force' },
              { icon: Activity,    label: 'Router Monitoring',   value: 'Live ping checks' },
              { icon: Radio,       label: 'MAC Verification',    value: 'Spoof detection'   },
            ].map((f, i) => (
              <div key={i} className="card p-3.5">
                <f.icon className="w-4 h-4 text-accent mb-2" />
                <div className="text-[10px] uppercase tracking-wider text-ink-300 font-semibold">{f.label}</div>
                <div className="text-sm text-white font-medium mt-0.5">{f.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Right — form ===== */}
      <div className="lg:col-span-2 flex items-center justify-center p-6 sm:p-10 bg-ink-950">
        <div className="w-full max-w-md fade-up">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-accent flex items-center justify-center">
              <Lock className="w-5 h-5 text-ink-950" strokeWidth={2.5} />
            </div>
            <div className="font-display text-lg font-bold text-white">Fiber Portal</div>
          </div>

          <h1 className="font-display text-3xl font-bold text-white tracking-tight">Welcome back</h1>
          <p className="text-ink-300 mt-2 text-sm">Sign in to manage your ISP infrastructure.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="input-label" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                className="input"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="input-label !mb-0" htmlFor="password">Password</label>
                <Link to="/forgot-password" className="text-xs text-accent hover:text-accent-dark font-semibold transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-ink-300 hover:text-white rounded-md hover:bg-white/[0.06]"
                  aria-label="Toggle password visibility"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Forgot username link */}
          <p className="mt-4 text-center text-xs text-ink-400">
            Forgot your username?{' '}
            <Link to="/forgot-username" className="text-accent hover:text-accent-dark font-semibold">
              Recover it
            </Link>
          </p>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[11px] uppercase tracking-widest text-ink-400">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Sign up CTA */}
          <Link to="/signup" className="btn-secondary w-full py-2.5 justify-center">
            Apply for a partner account
          </Link>

          <p className="mt-8 text-center text-xs text-ink-400">
            © {new Date().getFullYear()} Fiber Security Portal · Network Security Project (CIS-242L)
          </p>
        </div>
      </div>
    </div>
  )
}
