import { useEffect, useState } from 'react'
import { User, Lock, Save, Eye, EyeOff, UserCheck, UserX, Mail, Phone, AtSign, Crown } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import Loader from '../components/Loader'
import UserManagement from '../components/UserManagement'

export default function Settings() {
  const { user: ctxUser, updateLocalUser, logout } = useAuth()
  const [tab, setTab] = useState('profile')   // profile | password | signups | users

  // Profile state
  const [profile, setProfile] = useState({ username: '', email: '', full_name: '', phone: '' })
  const [profileLoading, setProfileLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)

  // Password state
  const [pwd, setPwd] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)

  // Pending signups state
  const [signups, setSignups] = useState([])
  const [signupsLoading, setSignupsLoading] = useState(false)
  const [busyUserId, setBusyUserId] = useState(null)

  // Owner check — shows Users tab only if current user is owner
  const [isOwner, setIsOwner] = useState(false)

  // Load profile + check owner status
  useEffect(() => {
    (async () => {
      try {
        const me = await api.get('/auth/me').then(r => r.data)
        setProfile({
          username:  me.username  || '',
          email:     me.email     || '',
          full_name: me.full_name || '',
          phone:     me.phone     || '',
        })
        setIsOwner(!!me.is_owner)
      } catch (err) { toast.error(err.message) }
      finally { setProfileLoading(false) }
    })()
  }, [])

  // Load signups when tab opens
  useEffect(() => {
    if (tab !== 'signups') return
    loadSignups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const loadSignups = async () => {
    setSignupsLoading(true)
    try {
      const data = await api.get('/auth/pending-signups').then(r => r.data)
      setSignups(data)
    } catch (err) { toast.error(err.message) }
    finally { setSignupsLoading(false) }
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const payload = {}
      for (const [k, v] of Object.entries(profile)) {
        if (v && v.trim()) payload[k] = v.trim()
      }
      await api.put('/auth/profile', payload)
      toast.success('Profile updated successfully')

      updateLocalUser({
        username:  payload.username  ?? ctxUser?.username,
        email:     payload.email     ?? ctxUser?.email,
        full_name: payload.full_name ?? ctxUser?.full_name,
      })

      if (payload.username && payload.username !== ctxUser?.username) {
        toast('Username changed — please sign in again', { icon: 'ℹ️', duration: 4000 })
        setTimeout(() => logout('silent'), 2000)
      }
    } catch (err) { toast.error(err.response?.data?.detail || err.message) }
    finally { setSavingProfile(false) }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (pwd.new_password !== pwd.confirm_password) {
      toast.error("New passwords don't match"); return
    }
    if (pwd.new_password.length < 6) {
      toast.error("New password must be at least 6 characters"); return
    }
    setSavingPwd(true)
    try {
      await api.put('/auth/password', {
        current_password: pwd.current_password,
        new_password:     pwd.new_password,
      })
      toast.success('Password changed successfully')
      setPwd({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) { toast.error(err.response?.data?.detail || err.message) }
    finally { setSavingPwd(false) }
  }

  const decideSignup = async (userId, approve) => {
    setBusyUserId(userId)
    try {
      await api.post(`/auth/pending-signups/${userId}/action`, { action: approve ? 'approve' : 'reject' })
      toast.success(approve ? 'Application approved' : 'Application rejected')
      loadSignups()
    } catch (err) { toast.error(err.response?.data?.detail || err.message) }
    finally { setBusyUserId(null) }
  }

  // Tabs configuration — Users tab only shown to owner
  const tabs = [
    { id: 'profile',  icon: User,       label: 'Profile' },
    { id: 'password', icon: Lock,       label: 'Password' },
    { id: 'signups',  icon: UserCheck,  label: 'Pending Signups' },
    ...(isOwner ? [{ id: 'users', icon: Crown, label: 'User Management' }] : []),
  ]

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="card p-1 inline-flex gap-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all
              ${tab === t.id ? 'bg-accent text-ink-950' : 'text-ink-200 hover:bg-white/[0.04]'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ============== PROFILE TAB ============== */}
      {tab === 'profile' && (
        <div className="card p-6 fade-up max-w-2xl">
          <h3 className="section-title">Profile Information</h3>
          <p className="section-subtitle mb-6">Update your account details. Changing your username will require you to sign in again.</p>

          {profileLoading ? <Loader label="Loading profile..." /> : (
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className="input-label"><AtSign className="w-3.5 h-3.5 inline mr-1" />Username</label>
                <input required minLength={3} className="input"
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })} />
              </div>

              <div>
                <label className="input-label"><User className="w-3.5 h-3.5 inline mr-1" />Full name</label>
                <input className="input"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label"><Mail className="w-3.5 h-3.5 inline mr-1" />Email</label>
                  <input required type="email" className="input"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                </div>
                <div>
                  <label className="input-label"><Phone className="w-3.5 h-3.5 inline mr-1" />Phone</label>
                  <input className="input"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="03001234567" />
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={savingProfile} className="btn-primary">
                  <Save className="w-4 h-4" /> {savingProfile ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ============== PASSWORD TAB ============== */}
      {tab === 'password' && (
        <div className="card p-6 fade-up max-w-2xl">
          <h3 className="section-title">Change Password</h3>
          <p className="section-subtitle mb-6">For your security, please enter your current password to confirm changes.</p>

          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="input-label">Current password</label>
              <div className="relative">
                <input required type={showPwd ? 'text' : 'password'} className="input pr-11"
                  value={pwd.current_password}
                  onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })} />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-ink-300 hover:text-white rounded-md">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="input-label">New password <span className="text-ink-400 normal-case font-normal">(min 6 characters)</span></label>
              <input required minLength={6} type={showPwd ? 'text' : 'password'} className="input"
                value={pwd.new_password}
                onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })} />
            </div>

            <div>
              <label className="input-label">Confirm new password</label>
              <input required minLength={6} type={showPwd ? 'text' : 'password'} className="input"
                value={pwd.confirm_password}
                onChange={(e) => setPwd({ ...pwd, confirm_password: e.target.value })} />
              {pwd.confirm_password && pwd.new_password !== pwd.confirm_password && (
                <p className="text-xs text-rose-300 mt-1">Passwords don't match</p>
              )}
            </div>

            <div className="pt-2">
              <button type="submit" disabled={savingPwd} className="btn-primary">
                <Lock className="w-4 h-4" /> {savingPwd ? 'Updating...' : 'Update password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============== PENDING SIGNUPS TAB ============== */}
      {tab === 'signups' && (
        <div className="card p-6 fade-up">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="section-title">Pending Signup Requests</h3>
              <p className="section-subtitle">Review and approve new partner accounts.</p>
            </div>
            <button onClick={loadSignups} className="btn-secondary">Refresh</button>
          </div>

          {signupsLoading ? <Loader label="Loading requests..." /> : signups.length === 0 ? (
            <div className="py-14 text-center">
              <UserCheck className="w-12 h-12 text-ink-500 mx-auto mb-3" />
              <p className="text-sm text-ink-300">No pending signup requests at the moment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {signups.map((s) => (
                <div key={s.id} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col md:flex-row md:items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500 to-accent flex items-center justify-center text-ink-950 font-bold shrink-0">
                    {(s.full_name || s.username).charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{s.full_name || s.username}</span>
                      <span className="badge-warn">@{s.username}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-ink-300 flex-wrap font-mono">
                      <span><Mail className="w-3 h-3 inline mr-1" />{s.email}</span>
                      {s.phone && <span><Phone className="w-3 h-3 inline mr-1" />{s.phone}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button disabled={busyUserId === s.id}
                      onClick={() => decideSignup(s.id, true)}
                      className="btn-primary py-1.5 px-3 text-xs">
                      <UserCheck className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button disabled={busyUserId === s.id}
                      onClick={() => {
                        if (confirm(`Reject ${s.full_name || s.username}'s application? This will delete the account.`)) {
                          decideSignup(s.id, false)
                        }
                      }}
                      className="btn-danger py-1.5 px-3 text-xs">
                      <UserX className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============== USER MANAGEMENT TAB (Owner only) ============== */}
      {tab === 'users' && isOwner && (
        <div className="fade-up">
          <UserManagement />
        </div>
      )}
    </div>
  )
}
