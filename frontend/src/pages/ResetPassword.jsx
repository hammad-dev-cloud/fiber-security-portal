import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Lock, ArrowLeft, KeyRound, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()
  const token          = searchParams.get('token')

  const [newPwd, setNewPwd]       = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd]     = useState(false)
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(false)

  // No token — invalid link
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-ink-950">
        <div className="card max-w-md w-full p-8 text-center fade-up">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-rose-400" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Invalid Reset Link</h1>
          <p className="text-ink-300 mt-3 text-sm">
            This password reset link is missing a token. Please request a new one.
          </p>
          <Link to="/forgot-password" className="btn-primary w-full mt-6 justify-center">
            Request new link
          </Link>
        </div>
      </div>
    )
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (newPwd !== confirmPwd) {
      toast.error("Passwords don't match")
      return
    }
    if (newPwd.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, new_password: newPwd })
      setSuccess(true)
      toast.success('Password reset successfully!')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      toast.error(err.message || 'Reset failed')
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
          <h1 className="font-display text-2xl font-bold text-white">Password Reset!</h1>
          <p className="text-ink-300 mt-3 text-sm">
            Your password has been successfully changed. Redirecting to login...
          </p>
          <Link to="/login" className="btn-primary w-full mt-6 justify-center">
            Sign in now
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-ink-950">
      <div className="w-full max-w-md fade-up">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-ink-300 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-accent flex items-center justify-center shadow-glow-cyan">
            <Lock className="w-5 h-5 text-ink-950" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display text-lg font-bold text-white">Fiber Security Portal</div>
            <div className="text-[10px] text-ink-300 uppercase tracking-widest">RESET YOUR PASSWORD</div>
          </div>
        </div>

        <h1 className="font-display text-3xl font-bold text-white tracking-tight flex items-center gap-2">
          <KeyRound className="w-7 h-7 text-accent" /> Set new password
        </h1>
        <p className="text-ink-300 mt-2 text-sm">
          Please choose a strong password you haven't used before.
        </p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <div>
            <label className="input-label">New password <span className="text-ink-400 normal-case font-normal ml-1">(min 6 characters)</span></label>
            <div className="relative">
              <input required minLength={6} type={showPwd ? 'text' : 'password'} className="input pr-11"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="••••••••" />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-ink-300 hover:text-white rounded-md hover:bg-white/[0.06]">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="input-label">Confirm new password</label>
            <input required minLength={6} type={showPwd ? 'text' : 'password'} className="input"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="••••••••" />
            {confirmPwd && newPwd !== confirmPwd && (
              <p className="text-xs text-rose-300 mt-1">Passwords don't match</p>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
            {loading ? 'Resetting password...' : 'Reset password'}
          </button>
        </form>
      </div>
    </div>
  )
}
