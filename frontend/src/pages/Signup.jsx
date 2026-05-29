import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, UserPlus, ArrowLeft, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

export default function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '',
    username: '', password: '', confirm_password: '',
  })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()

    if (form.password !== form.confirm_password) {
      toast.error("Passwords don't match")
      return
    }

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email:     form.email.trim().toLowerCase(),
        username:  form.username.trim(),
        password:  form.password,
      }
      if (form.phone.trim()) payload.phone = form.phone.trim()

      await api.post('/auth/signup', payload)
      setSuccess(true)
      toast.success('Signup submitted successfully!')
    } catch (err) {
      toast.error(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-ink-950">
        <div className="card max-w-md w-full p-8 text-center fade-up">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Application Submitted!</h1>
          <p className="text-ink-300 mt-3 text-sm leading-relaxed">
            Thank you for signing up. Your account is now <strong className="text-emerald-300">pending admin approval</strong>.
            You will receive an email at <strong className="text-white">{form.email}</strong> once your account is reviewed.
          </p>
          <p className="text-ink-400 mt-4 text-xs">This usually takes a few hours.</p>

          <button onClick={() => navigate('/login')} className="btn-primary w-full mt-6">
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-ink-950">
      <div className="w-full max-w-md fade-up">
        {/* Back to login */}
        <Link to="/login" className="inline-flex items-center gap-1.5 text-ink-300 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>

        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-accent flex items-center justify-center shadow-glow-cyan">
            <Lock className="w-5 h-5 text-ink-950" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display text-lg font-bold text-white">Fiber Security Portal</div>
            <div className="text-[10px] text-ink-300 uppercase tracking-widest">PARTNER APPLICATION</div>
          </div>
        </div>

        <h1 className="font-display text-3xl font-bold text-white tracking-tight flex items-center gap-2">
          <UserPlus className="w-7 h-7 text-accent" /> Create your account
        </h1>
        <p className="text-ink-300 mt-2 text-sm">
          Apply for a partner portal account. An administrator will review your application.
        </p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          {/* Full name */}
          <div>
            <label className="input-label">Full name *</label>
            <input required minLength={2} className="input"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="John Doe" />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Email *</label>
              <input required type="email" className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="input-label">Phone</label>
              <input className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="03001234567" />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="input-label">Username *</label>
            <input required minLength={3} className="input"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="johndoe" />
          </div>

          {/* Password */}
          <div>
            <label className="input-label">Password * <span className="text-ink-400 normal-case font-normal ml-1">(min 6 characters)</span></label>
            <div className="relative">
              <input required minLength={6} type={showPwd ? 'text' : 'password'} className="input pr-11"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••" />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-ink-300 hover:text-white rounded-md hover:bg-white/[0.06]">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="input-label">Confirm password *</label>
            <input required minLength={6} type={showPwd ? 'text' : 'password'} className="input"
              value={form.confirm_password}
              onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
              placeholder="••••••••" />
            {form.confirm_password && form.password !== form.confirm_password && (
              <p className="text-xs text-rose-300 mt-1">Passwords don't match</p>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
            {loading ? 'Submitting...' : 'Submit application'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-400">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:text-accent-dark font-semibold">Sign in</Link>
        </p>

        <div className="mt-4 p-3 rounded-lg border border-amber-500/15 bg-amber-500/[0.04]">
          <p className="text-xs text-amber-300/80 leading-relaxed">
            <strong className="text-amber-300">Note:</strong> All applications require admin approval. You'll be notified by email once your account is reviewed.
          </p>
        </div>
      </div>
    </div>
  )
}
