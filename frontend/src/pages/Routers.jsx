import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Wifi, WifiOff, RefreshCw, Activity } from 'lucide-react'
import toast from 'react-hot-toast'
import { routerApi, customerApi } from '../api'
import Modal from '../components/Modal'
import Loader from '../components/Loader'
import { timeAgo, statusBadgeClass } from '../utils/format'

const EMPTY = { customer_id: '', router_name: '', ip_address: '', mac_address: '', model: '', location: '' }

export default function Routers() {
  const [rows, setRows]         = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]   = useState(true)
  const [pinging, setPinging]   = useState(false)
  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [r, c] = await Promise.all([routerApi.list(), customerApi.list()])
      setRows(r); setCustomers(c)
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const onPingAll = async () => {
    setPinging(true)
    try {
      const r = await routerApi.pingAll()
      toast.success(`Pinged ${r.total} routers — ${r.online} online, ${r.offline} offline`)
      load()
    } catch (err) { toast.error(err.message) }
    finally { setPinging(false) }
  }

  const onPingOne = async (id) => {
    try {
      const r = await routerApi.ping(id)
      toast.success(`${r.status === 'online' ? `Online (${r.last_ping_ms} ms)` : 'Offline'}`)
      load()
    } catch (err) { toast.error(err.message) }
  }

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpenModal(true) }
  const openEdit   = (r) => {
    setEditing(r)
    setForm({
      customer_id: r.customer_id || '', router_name: r.router_name || '',
      ip_address: r.ip_address || '', mac_address: r.mac_address || '',
      model: r.model || '', location: r.location || '',
    })
    setOpenModal(true)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, customer_id: form.customer_id ? Number(form.customer_id) : null }
      if (editing) { await routerApi.update(editing.id, payload); toast.success('Router updated') }
      else         { await routerApi.create(payload);             toast.success('Router added') }
      setOpenModal(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const onDelete = async (r) => {
    if (!confirm(`Delete router "${r.router_name || r.ip_address}"?`)) return
    try { await routerApi.remove(r.id); toast.success('Deleted'); load() }
    catch (err) { toast.error(err.message) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end gap-2">
        <button onClick={onPingAll} disabled={pinging} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${pinging && 'animate-spin'}`} /> {pinging ? 'Pinging...' : 'Ping All'}
        </button>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Add Router</button>
      </div>

      {loading ? <Loader full label="Loading routers..." /> : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 fade-up">
          {rows.map((r) => {
            const online = r.status === 'online'
            const cust = customers.find((c) => c.id === r.customer_id)
            return (
              <div key={r.id} className="card p-5">
                <div className={`absolute top-0 left-0 right-0 h-[2px] ${online ? 'bg-gradient-to-r from-emerald-400 to-accent' : 'bg-gradient-to-r from-rose-500 to-amber-500'} opacity-60`} />
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${online ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
                      {online ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-display font-bold text-white">{r.router_name || `Router #${r.id}`}</div>
                      <div className="text-xs text-ink-400 font-mono">{r.ip_address}</div>
                    </div>
                  </div>
                  <span className={statusBadgeClass(r.status)}>
                    {online && <span className="glow-dot bg-emerald-400" />}
                    {r.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <div className="text-ink-400 text-[10px] uppercase tracking-wider">Latency</div>
                    <div className="text-white font-semibold mt-0.5">{r.last_ping_ms ? `${r.last_ping_ms} ms` : '—'}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <div className="text-ink-400 text-[10px] uppercase tracking-wider">Last check</div>
                    <div className="text-white font-semibold mt-0.5">{timeAgo(r.last_checked_at)}</div>
                  </div>
                </div>

                <div className="text-xs space-y-1 mb-4">
                  {cust && <div><span className="text-ink-400">Customer: </span><span className="text-ink-200">{cust.full_name}</span></div>}
                  {r.mac_address && <div><span className="text-ink-400">MAC: </span><span className="text-ink-200 font-mono">{r.mac_address}</span></div>}
                  {r.model && <div><span className="text-ink-400">Model: </span><span className="text-ink-200">{r.model}</span></div>}
                  {r.location && <div><span className="text-ink-400">Location: </span><span className="text-ink-200">{r.location}</span></div>}
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => onPingOne(r.id)} className="btn-secondary flex-1 py-1.5 text-xs"><Activity className="w-3.5 h-3.5" /> Ping</button>
                  <button onClick={() => openEdit(r)} className="btn-ghost py-1.5 px-2"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(r)} className="btn-ghost py-1.5 px-2 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )
          })}
          {rows.length === 0 && <div className="col-span-full py-16 text-center text-sm text-ink-300 card">No routers added yet.</div>}
        </div>
      )}

      <Modal open={openModal} onClose={() => setOpenModal(false)} title={editing ? 'Edit Router' : 'Add Router'} maxWidth="max-w-xl">
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="input-label">Router name</label>
            <input className="input" value={form.router_name} onChange={(e) => setForm({ ...form, router_name: e.target.value })} />
          </div>
          <div><label className="input-label">IP address *</label>
            <input required className="input font-mono" placeholder="192.168.10.100" value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} />
          </div>
          <div><label className="input-label">MAC address</label>
            <input className="input font-mono" placeholder="AA:BB:CC:DD:EE:FF" value={form.mac_address} onChange={(e) => setForm({ ...form, mac_address: e.target.value })} />
          </div>
          <div><label className="input-label">Linked customer</label>
            <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">— None —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
          <div><label className="input-label">Model</label>
            <input className="input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </div>
          <div className="md:col-span-2"><label className="input-label">Location</label>
            <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpenModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
