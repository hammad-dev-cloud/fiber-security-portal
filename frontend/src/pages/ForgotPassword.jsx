import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

export default function ForgotPassword() {
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() })
      setSent(true)
    } catch (err) {
      toast.error(err.message || 'Failed to send reset link')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-ink-950">
        <div className="card max-w-md w-full p-8 text-center fade-up">
          <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Check your inbox</h1>
          <p className="text-ink-300 mt-3 text-sm leading-relaxed">
            If an account exists with <strong className="text-white">{email}</strong>, we've sent a password reset link to that address.
          </p>
          <p className="text-ink-400 mt-3 text-xs">
            The link will expire in <strong className="text-amber-300">1 hour</strong>. Don't forget to check your spam folder.
          </p>
          <Link to="/login" className="btn-primary w-full mt-6 justify-center">
            Back to Login
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
            <div className="text-[10px] text-ink-300 uppercase tracking-widest">PASSWORD RECOVERY</div>
          </div>
        </div>

        <h1 className="font-display text-3xl font-bold text-white tracking-tight">Forgot password?</h1>
        <p className="text-ink-300 mt-2 text-sm">
          Enter your email address and we'll send you a secure link to reset your password.
        </p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <div>
            <label className="input-label">Email address</label>
            <input required type="email" className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
            {loading ? 'Sending reset link...' : 'Send reset link'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-400">
          Remembered your password?{' '}
          <Link to="/login" className="text-accent hover:text-accent-dark font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
