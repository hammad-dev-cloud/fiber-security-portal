import { useEffect, useState } from 'react'
import {
  Users, Crown, ShieldCheck, Eye, CheckCircle2, XCircle, Trash2,
  Clock, Mail, Phone, RefreshCw, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import Loader from './Loader'
import { useAuth } from '../context/AuthContext'

const roleConfig = {
  owner:  { icon: Crown,       label: 'Owner',  color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  admin:  { icon: ShieldCheck, label: 'Admin',  color: 'text-cyan-300',  bg: 'bg-cyan-500/10',  border: 'border-cyan-500/30' },
  viewer: { icon: Eye,          label: 'Viewer', color: 'text-ink-300',  bg: 'bg-ink-500/10',   border: 'border-white/10' },
}

export default function UserManagement() {
  const { user: currentUser } = useAuth()
  const [users,   setUsers]   = useState([])
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [usersData, statsData] = await Promise.all([
        api.get('/auth/users').then(r => r.data),
        api.get('/auth/users/stats').then(r => r.data),
      ])
      setUsers(usersData)
      setStats(statsData)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message
      setError(msg)
      if (err.response?.status === 403) {
        toast.error('Only the owner can access user management')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ---------- Actions ----------
  const toggleStatus = async (u) => {
    if (!confirm(`${u.is_active ? 'Deactivate' : 'Activate'} user '${u.username}'?`)) return
    setBusy(true)
    try {
      await api.put(`/auth/users/${u.id}/status`, { is_active: !u.is_active })
      toast.success(`User ${u.is_active ? 'deactivated' : 'activated'}`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message)
    } finally { setBusy(false) }
  }

  const changeRole = async (u) => {
    const newRole = u.role === 'admin' ? 'viewer' : 'admin'
    if (!confirm(`Change ${u.username}'s role from '${u.role}' to '${newRole}'?`)) return
    setBusy(true)
    try {
      await api.put(`/auth/users/${u.id}/role`, { role: newRole })
      toast.success(`Role changed to ${newRole}`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message)
    } finally { setBusy(false) }
  }

  const deleteUser = async (u) => {
    if (!confirm(`PERMANENTLY delete user '${u.username}'? This cannot be undone.`)) return
    if (!confirm(`Are you absolutely sure? Type the user's data will be lost forever.`)) return
    setBusy(true)
    try {
      await api.delete(`/auth/users/${u.id}`)
      toast.success(`User '${u.username}' deleted`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message)
    } finally { setBusy(false) }
  }

  const getRoleKey = (u) => u.is_owner ? 'owner' : (u.role || 'admin')

  const formatDate = (iso) => {
    if (!iso) return 'Never'
    try {
      const d = new Date(iso)
      return d.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
    } catch { return iso }
  }

  if (loading) return <Loader label="Loading users..." />

  if (error) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-white mb-2">Access Restricted</h3>
        <p className="text-sm text-ink-300">{error}</p>
        <p className="text-xs text-ink-400 mt-2">User management is restricted to the system owner.</p>
      </div>
    )
  }

  // ============================================================
  return (
    <div className="space-y-5">
      {/* ============== Header ============== */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center">
          <Crown className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">User Management</h2>
          <p className="text-xs text-ink-400">Owner-only — manage admin accounts and partner access</p>
        </div>
        <div className="flex-1" />
        <button onClick={load} className="btn-secondary !py-1.5 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* ============== Stats ============== */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox label="Total Users"   value={stats.total}    color="text-white" />
          <StatBox label="Active"        value={stats.active}   color="text-emerald-300" />
          <StatBox label="Inactive"      value={stats.inactive} color="text-rose-300" />
          <StatBox label="Pending"       value={stats.pending}  color="text-amber-300" />
        </div>
      )}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox label="Owners"        value={stats.owners}   color="text-amber-300" small />
          <StatBox label="Admins"        value={stats.admins}   color="text-cyan-300"  small />
          <StatBox label="Viewers"       value={stats.viewers}  color="text-ink-200"   small />
          <StatBox label="Total Logins"  value={stats.total_logins} color="text-accent" small />
        </div>
      )}

      {/* ============== Users Table ============== */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.05] bg-white/[0.02]">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            All Accounts ({users.length})
          </h3>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {users.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-ink-400">No users found.</div>
          )}

          {users.map((u) => {
            const roleKey = getRoleKey(u)
            const config  = roleConfig[roleKey]
            const Icon    = config.icon
            const isSelf  = u.id === currentUser?.id
            const isOwner = u.is_owner

            return (
              <div key={u.id} className={`px-4 py-4 hover:bg-white/[0.02] transition-colors
                ${isSelf ? 'bg-accent/[0.03]' : ''}`}>

                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                    ${config.bg} ${config.border} border`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {/* Name row */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-white">{u.full_name || u.username}</span>
                      <span className="text-xs text-ink-300 font-mono">@{u.username}</span>

                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                        ${config.bg} ${config.color} ${config.border} border`}>
                        {config.label}
                      </span>

                      {isSelf && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                          bg-accent/10 text-accent border border-accent/30">
                          You
                        </span>
                      )}

                      {u.is_active ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                          bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                          bg-rose-500/10 text-rose-300 border border-rose-500/30">
                          Inactive
                        </span>
                      )}

                      {u.is_pending && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                          bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          Pending
                        </span>
                      )}
                    </div>

                    {/* Contact row */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-ink-300 font-mono mb-2">
                      <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {u.email}</span>
                      {u.phone && <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {u.phone}</span>}
                    </div>

                    {/* Stats row */}
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-ink-400 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> Created: {formatDate(u.created_at)}
                      </span>
                      <span>Last login: {formatDate(u.last_login_at)}</span>
                      <span>Logins: {u.login_count ?? 0}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isOwner ? (
                      <span className="text-xs text-ink-400 italic px-3">Protected</span>
                    ) : isSelf ? (
                      <span className="text-xs text-ink-400 italic px-3">Self</span>
                    ) : (
                      <>
                        {/* Toggle status */}
                        <button onClick={() => toggleStatus(u)} disabled={busy}
                          title={u.is_active ? 'Deactivate' : 'Activate'}
                          className={`p-2 rounded-lg transition-colors
                            ${u.is_active
                              ? 'text-rose-300 hover:bg-rose-500/10'
                              : 'text-emerald-300 hover:bg-emerald-500/10'}`}>
                          {u.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>

                        {/* Change role */}
                        <button onClick={() => changeRole(u)} disabled={busy || u.is_pending}
                          title={`Change to ${u.role === 'admin' ? 'viewer' : 'admin'}`}
                          className="p-2 rounded-lg text-cyan-300 hover:bg-cyan-500/10 transition-colors disabled:opacity-30">
                          {u.role === 'admin' ? <Eye className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                        </button>

                        {/* Delete */}
                        <button onClick={() => deleteUser(u)} disabled={busy}
                          title="Delete user"
                          className="p-2 rounded-lg text-rose-300 hover:bg-rose-500/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ============== Info Footer ============== */}
      <div className="card p-4 bg-amber-500/[0.04] border-amber-500/20">
        <div className="flex gap-3">
          <Crown className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
          <div className="text-xs text-ink-200 space-y-1">
            <p><strong className="text-amber-200">Owner Privileges:</strong> Only the system owner can manage user accounts.</p>
            <p>• <strong>Activate/Deactivate</strong> — Toggle login access without deleting data</p>
            <p>• <strong>Change Role</strong> — Switch between admin (full access) and viewer (read-only)</p>
            <p>• <strong>Delete</strong> — Permanently remove a user account</p>
            <p>• <strong>Protected accounts</strong> — Owner and your own account cannot be modified</p>
          </div>
        </div>
      </div>
    </div>
  )
}


function StatBox({ label, value, color = 'text-white', small = false }) {
  return (
    <div className="card p-3">
      <p className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">{label}</p>
      <p className={`${small ? 'text-xl' : 'text-2xl'} font-bold ${color} mt-1`}>{value ?? 0}</p>
    </div>
  )
}
