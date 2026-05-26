import { useEffect, useState } from 'react'
import { Check, Trash2, ShieldAlert, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import { alertApi } from '../api'
import Loader from '../components/Loader'
import { timeAgo, severityBadgeClass } from '../utils/format'

export default function Alerts() {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [severity, setSeverity] = useState('')
  const [resolved, setResolved] = useState('open')   // open | resolved | all

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (severity) params.severity = severity
      if (resolved === 'open')      params.resolved = false
      if (resolved === 'resolved')  params.resolved = true
      setRows(await alertApi.list(params))
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [severity, resolved])

  const onResolve = async (a) => {
    try { await alertApi.resolve(a.id); toast.success('Marked resolved'); load() }
    catch (err) { toast.error(err.message) }
  }
  const onDelete = async (a) => {
    if (!confirm('Delete this alert?')) return
    try { await alertApi.remove(a.id); toast.success('Deleted'); load() }
    catch (err) { toast.error(err.message) }
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-ink-300 ml-2" />
        <select className="input w-auto py-1.5 text-xs" value={resolved} onChange={(e) => setResolved(e.target.value)}>
          <option value="open">Open only</option>
          <option value="resolved">Resolved only</option>
          <option value="all">All</option>
        </select>
        <select className="input w-auto py-1.5 text-xs" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <span className="ml-auto text-xs text-ink-300 font-mono">{rows.length} result{rows.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? <Loader full label="Loading alerts..." /> : rows.length === 0 ? (
        <div className="card py-16 text-center fade-up">
          <ShieldAlert className="w-12 h-12 text-ink-500 mx-auto mb-3" />
          <p className="text-sm text-ink-300">No security alerts match your filters.</p>
        </div>
      ) : (
        <div className="space-y-2 fade-up">
          {rows.map((a) => (
            <div key={a.id} className="card p-4 flex items-start gap-4">
              <div className="shrink-0 mt-0.5"><span className={severityBadgeClass(a.severity)}>{a.severity}</span></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-accent">{a.alert_type}</span>
                  {a.is_resolved && <span className="badge-success">resolved</span>}
                </div>
                <p className="text-sm text-white leading-snug">{a.message}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-ink-400 font-mono flex-wrap">
                  <span>{timeAgo(a.created_at)}</span>
                  {a.source_ip && <span>· IP {a.source_ip}</span>}
                  {a.source_mac && <span>· MAC {a.source_mac}</span>}
                  {a.target && <span>· target: {a.target}</span>}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1">
                {!a.is_resolved && (
                  <button onClick={() => onResolve(a)} className="btn-ghost py-1.5 px-2 hover:text-emerald-300" title="Mark resolved">
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => onDelete(a)} className="btn-ghost py-1.5 px-2 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
