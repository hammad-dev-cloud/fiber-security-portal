import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Zap, Database, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { packageApi } from '../api'
import Modal from '../components/Modal'
import Loader from '../components/Loader'
import { formatPKR } from '../utils/format'

const EMPTY = { name: '', speed_mbps: 25, price_pkr: 1000, data_limit_gb: '', duration_days: 30, description: '', is_active: true }

export default function Packages() {
  const [rows, setRows]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)

  const load = async () => {
    setLoading(true)
    try { setRows(await packageApi.list()) }
    catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpenModal(true) }
  const openEdit   = (p) => {
    setEditing(p)
    setForm({
      name: p.name, speed_mbps: p.speed_mbps, price_pkr: p.price_pkr,
      data_limit_gb: p.data_limit_gb ?? '', duration_days: p.duration_days,
      description: p.description || '', is_active: p.is_active,
    })
    setOpenModal(true)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        speed_mbps:    Number(form.speed_mbps),
        price_pkr:     Number(form.price_pkr),
        duration_days: Number(form.duration_days),
        data_limit_gb: form.data_limit_gb === '' ? null : Number(form.data_limit_gb),
      }
      if (editing) { await packageApi.update(editing.id, payload); toast.success('Package updated') }
      else         { await packageApi.create(payload);             toast.success('Package added') }
      setOpenModal(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const onDelete = async (p) => {
    if (!confirm(`Delete package "${p.name}"?`)) return
    try { await packageApi.remove(p.id); toast.success('Deleted'); load() }
    catch (err) { toast.error(err.message) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Add Package</button>
      </div>

      {loading ? <Loader full label="Loading packages..." /> : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 fade-up">
          {rows.map((p, i) => (
            <div key={p.id} className={`card p-5 group fade-up fade-up-${(i % 4) + 1}`}>
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 to-accent opacity-60" />

              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="font-display text-lg font-bold text-white">{p.name}</div>
                  <div className="text-xs text-ink-400 mt-0.5">{p.is_active ? 'Active' : 'Inactive'}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(p)} className="btn-ghost py-1.5 px-2"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(p)} className="btn-ghost py-1.5 px-2 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="flex items-end gap-1 mb-4">
                <span className="font-display text-3xl font-bold text-gradient">{formatPKR(p.price_pkr)}</span>
                <span className="text-xs text-ink-400 mb-1">/month</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <Zap className="w-3.5 h-3.5 text-cyan-300 mb-1" />
                  <div className="text-white font-semibold">{p.speed_mbps} Mbps</div>
                  <div className="text-ink-400 text-[10px]">Speed</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <Database className="w-3.5 h-3.5 text-accent mb-1" />
                  <div className="text-white font-semibold">{p.data_limit_gb ? `${p.data_limit_gb} GB` : 'Unlimited'}</div>
                  <div className="text-ink-400 text-[10px]">Data</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <Clock className="w-3.5 h-3.5 text-violet-300 mb-1" />
                  <div className="text-white font-semibold">{p.duration_days}d</div>
                  <div className="text-ink-400 text-[10px]">Duration</div>
                </div>
              </div>

              {p.description && <p className="text-xs text-ink-300 mt-3 leading-relaxed">{p.description}</p>}
            </div>
          ))}
          {rows.length === 0 && <div className="col-span-full py-16 text-center text-sm text-ink-300 card">No packages yet.</div>}
        </div>
      )}

      <Modal open={openModal} onClose={() => setOpenModal(false)} title={editing ? 'Edit Package' : 'Add Package'} maxWidth="max-w-xl">
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="input-label">Name *</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div><label className="input-label">Speed (Mbps) *</label>
            <input required type="number" min="1" className="input" value={form.speed_mbps} onChange={(e) => setForm({ ...form, speed_mbps: e.target.value })} />
          </div>
          <div><label className="input-label">Price (PKR) *</label>
            <input required type="number" min="0" step="0.01" className="input" value={form.price_pkr} onChange={(e) => setForm({ ...form, price_pkr: e.target.value })} />
          </div>
          <div><label className="input-label">Data Limit (GB)</label>
            <input type="number" min="0" placeholder="Leave blank = unlimited" className="input" value={form.data_limit_gb} onChange={(e) => setForm({ ...form, data_limit_gb: e.target.value })} />
          </div>
          <div><label className="input-label">Duration (days) *</label>
            <input required type="number" min="1" className="input" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} />
          </div>
          <div className="md:col-span-2"><label className="input-label">Description</label>
            <textarea rows={2} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <label className="md:col-span-2 flex items-center gap-2 text-sm text-ink-200">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-accent" />
            Active package (visible to customers)
          </label>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpenModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
