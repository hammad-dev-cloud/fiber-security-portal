import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldAlert, CheckCircle2, Trash2, Filter, RefreshCw,
  AlertTriangle, AlertCircle, Info, ShieldCheck, CheckCheck, Square, CheckSquare,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import Loader from '../components/Loader'
import { timeAgo } from '../utils/format'

const severityConfig = {
  critical: { icon: AlertTriangle, color: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/30', label: 'Critical' },
  high:     { icon: AlertCircle,   color: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'High' },
  medium:   { icon: ShieldAlert,   color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Medium' },
  low:      { icon: Info,           color: 'text-cyan-300', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', label: 'Low' },
}

export default function Alerts() {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')        // all | unresolved | resolved
  const [severity, setSeverity] = useState('all')    // all | critical | high | medium | low

  // NEW — bulk selection state
  const [selected, setSelected] = useState(new Set())
  const [busy, setBusy] = useState(false)

  // ---------- Load ----------
  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter === 'unresolved') params.resolved = false
      if (filter === 'resolved')   params.resolved = true
      if (severity !== 'all')      params.severity = severity

      const data = await api.get('/alerts/', { params }).then(r => r.data)
      setAlerts(data)
      setSelected(new Set())     // clear selection on refresh
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter, severity])

  // ---------- Single actions ----------
  const resolveOne = async (id) => {
    try {
      await api.post(`/alerts/${id}/resolve`)
      toast.success('Alert resolved')
      load()
    } catch (err) { toast.error(err.message) }
  }

  const deleteOne = async (id) => {
    if (!confirm('Delete this alert permanently?')) return
    try {
      await api.delete(`/alerts/${id}`)
      toast.success('Alert deleted')
      load()
    } catch (err) { toast.error(err.message) }
  }

  // ---------- Selection ----------
  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectableIds = useMemo(() => alerts.map(a => a.id), [alerts])
  const allSelected   = selectableIds.length > 0 && selected.size === selectableIds.length
  const someSelected  = selected.size > 0 && !allSelected

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(selectableIds))
  }

  // ---------- Bulk actions ----------
  const bulkResolve = async () => {
    if (selected.size === 0) return
    setBusy(true)
    try {
      const ids = [...selected]
      const res = await api.post('/alerts/bulk/resolve', { ids }).then(r => r.data)
      toast.success(`Resolved ${res.updated} alert(s)`)
      load()
    } catch (err) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  const bulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} selected alert(s)? This cannot be undone.`)) return
    setBusy(true)
    try {
      const ids = [...selected]
      const res = await api.post('/alerts/bulk/delete', { ids }).then(r => r.data)
      toast.success(`Deleted ${res.deleted} alert(s)`)
      load()
    } catch (err) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  const resolveAllUnresolved = async () => {
    const unresolvedCount = alerts.filter(a => !a.is_resolved).length
    if (unresolvedCount === 0) {
      toast('No unresolved alerts to resolve', { icon: 'ℹ️' })
      return
    }
    if (!confirm(`Resolve ALL ${unresolvedCount} unresolved alert(s)?`)) return
    setBusy(true)
    try {
      const res = await api.post('/alerts/resolve-all').then(r => r.data)
      toast.success(`Resolved ${res.updated} alert(s)`)
      load()
    } catch (err) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  const clearAllResolved = async () => {
    const resolvedCount = alerts.filter(a => a.is_resolved).length
    if (resolvedCount === 0) {
      toast('No resolved alerts to clear', { icon: 'ℹ️' })
      return
    }
    if (!confirm(`Permanently delete ALL ${resolvedCount} resolved alert(s)?`)) return
    setBusy(true)
    try {
      const res = await api.delete('/alerts/clear-resolved').then(r => r.data)
      toast.success(`Cleared ${res.deleted} resolved alert(s)`)
      load()
    } catch (err) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  // ============================================================
  return (
    <div className="space-y-5">
      {/* ============== Toolbar ============== */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        {/* Filter — Status */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-ink-300" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="input !py-1.5 !w-auto text-sm">
            <option value="all">All alerts</option>
            <option value="unresolved">Unresolved only</option>
            <option value="resolved">Resolved only</option>
          </select>
        </div>

        {/* Filter — Severity */}
        <select value={severity} onChange={(e) => setSeverity(e.target.value)}
          className="input !py-1.5 !w-auto text-sm">
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <button onClick={load} className="btn-secondary !py-1.5 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>

        <div className="flex-1" />

        {/* Right side — bulk action buttons (always visible) */}
        <button onClick={resolveAllUnresolved} disabled={busy} className="btn-secondary !py-1.5 text-sm">
          <CheckCheck className="w-4 h-4" /> Resolve all
        </button>
        <button onClick={clearAllResolved} disabled={busy}
          className="btn-secondary !py-1.5 text-sm hover:!border-rose-500/40 hover:!text-rose-200">
          <Trash2 className="w-4 h-4" /> Clear resolved
        </button>
      </div>

      {/* ============== Selected actions bar ============== */}
      {selected.size > 0 && (
        <div className="card p-3 bg-accent/[0.06] border-accent/30 flex items-center gap-3 fade-up">
          <span className="text-sm font-semibold text-accent">
            {selected.size} selected
          </span>
          <div className="flex-1" />
          <button onClick={bulkResolve} disabled={busy} className="btn-primary !py-1.5 text-sm">
            <CheckCircle2 className="w-4 h-4" /> Resolve selected
          </button>
          <button onClick={bulkDelete} disabled={busy} className="btn-danger !py-1.5 text-sm">
            <Trash2 className="w-4 h-4" /> Delete selected
          </button>
          <button onClick={() => setSelected(new Set())} className="btn-secondary !py-1.5 text-sm">
            Cancel
          </button>
        </div>
      )}

      {/* ============== Alerts list ============== */}
      {loading ? <Loader label="Loading alerts..." /> : alerts.length === 0 ? (
        <div className="card p-14 text-center">
          <ShieldCheck className="w-12 h-12 text-ink-500 mx-auto mb-3" />
          <p className="text-sm text-ink-300">No alerts matching the selected filters.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* ===== Header with Select All checkbox ===== */}
          <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-3 bg-white/[0.02]">
            <button onClick={toggleAll} className="p-1 -ml-1 hover:bg-white/[0.05] rounded transition-colors"
              title={allSelected ? 'Deselect all' : 'Select all'}>
              {allSelected ? (
                <CheckSquare className="w-5 h-5 text-accent" strokeWidth={2.2} />
              ) : someSelected ? (
                <div className="w-5 h-5 rounded border-2 border-accent bg-accent/30 flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-accent rounded-full" />
                </div>
              ) : (
                <Square className="w-5 h-5 text-ink-400" strokeWidth={2.2} />
              )}
            </button>
            <span className="text-xs uppercase tracking-wider text-ink-300 font-semibold">
              {allSelected ? 'All selected' : someSelected ? `${selected.size} of ${alerts.length} selected` : 'Select all'}
            </span>
            <div className="flex-1" />
            <span className="text-xs text-ink-400 font-mono">{alerts.length} alert{alerts.length !== 1 ? 's' : ''}</span>
          </div>

          {/* ===== Alert rows ===== */}
          <div className="divide-y divide-white/[0.04]">
            {alerts.map((a) => {
              const config = severityConfig[a.severity] || severityConfig.low
              const Icon   = config.icon
              const isChecked = selected.has(a.id)
              const isResolved = a.is_resolved

              return (
                <div key={a.id}
                  className={`px-4 py-3.5 flex items-start gap-3 transition-colors
                    ${isChecked ? 'bg-accent/[0.04]' : 'hover:bg-white/[0.02]'}
                    ${isResolved ? 'opacity-60' : ''}`}>

                  {/* Checkbox */}
                  <button onClick={() => toggleOne(a.id)}
                    className="p-1 -ml-1 mt-0.5 hover:bg-white/[0.05] rounded transition-colors shrink-0">
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 text-accent" strokeWidth={2.2} />
                    ) : (
                      <Square className="w-5 h-5 text-ink-400" strokeWidth={2.2} />
                    )}
                  </button>

                  {/* Severity Icon */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${config.bg} ${config.border} border`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm">
                        {a.alert_type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                        ${config.bg} ${config.color} ${config.border} border`}>
                        {config.label}
                      </span>
                      {isResolved && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                          bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink-200 mt-1">{a.message}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-ink-400 font-mono flex-wrap">
                      {a.source_ip  && <span>IP: {a.source_ip}</span>}
                      {a.source_mac && <span>MAC: {a.source_mac}</span>}
                      {a.target     && <span>Target: {a.target}</span>}
                      <span className="ml-auto">{timeAgo(a.created_at)}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!isResolved && (
                      <button onClick={() => resolveOne(a.id)}
                        title="Resolve"
                        className="p-2 rounded-lg text-emerald-300 hover:bg-emerald-500/10 transition-colors">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => deleteOne(a.id)}
                      title="Delete"
                      className="p-2 rounded-lg text-rose-300 hover:bg-rose-500/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
