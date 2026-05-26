import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { customerApi, packageApi } from '../api'
import Modal from '../components/Modal'
import Loader from '../components/Loader'
import { formatDate, daysUntil, statusBadgeClass } from '../utils/format'

const EMPTY = {
  full_name: '', email: '', phone: '', cnic: '', address: '',
  mac_address: '', ip_address: '', package_id: '', expiry_date: '',
  status: 'active', notes: '',
}

export default function Customers() {
  const [rows, setRows]         = useState([])
  const [packages, setPackages] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing]   = useState(null)   // customer object or null
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [c, p] = await Promise.all([
        customerApi.list({ status: statusFilter || undefined, search: search || undefined }),
        packageApi.list(),
      ])
      setRows(c); setPackages(p)
    } catch (err) {
      toast.error(err.message)
    } finally { setLoading(false) }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [statusFilter])

  // Client-side debounce search
  useEffect(() => {
    const id = setTimeout(load, 350)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpenModal(true) }
  const openEdit   = (c) => {
    setEditing(c)
    setForm({
      full_name: c.full_name || '', email: c.email || '', phone: c.phone || '',
      cnic: c.cnic || '', address: c.address || '',
      mac_address: c.mac_address || '', ip_address: c.ip_address || '',
      package_id: c.package_id || '', expiry_date: c.expiry_date || '',
      status: c.status || 'active', notes: c.notes || '',
    })
    setOpenModal(true)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.email)      delete payload.email
      if (!payload.package_id) delete payload.package_id
      else payload.package_id = Number(payload.package_id)

      if (editing) {
        await customerApi.update(editing.id, payload)
        toast.success('Customer updated')
      } else {
        await customerApi.create(payload)
        toast.success('Customer added')
      }
      setOpenModal(false)
      load()
    } catch (err) { toast.error(err.message) }
    finally       { setSaving(false) }
  }

  const onDelete = async (c) => {
    if (!confirm(`Delete customer "${c.full_name}"?`)) return
    try {
      await customerApi.remove(c.id)
      toast.success('Customer deleted')
      load()
    } catch (err) { toast.error(err.message) }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            placeholder="Search by name, email, MAC or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input sm:w-44"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
          <option value="terminated">Terminated</option>
        </select>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden fade-up">
        {loading ? (
          <Loader label="Loading customers..." />
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-ink-300">
            No customers found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>MAC / IP</th>
                  <th>Package</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const pkg = packages.find((p) => p.id === c.package_id)
                  const days = daysUntil(c.expiry_date)
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="text-white font-medium">{c.full_name}</div>
                        <div className="text-xs text-ink-400">{c.email || c.phone || '—'}</div>
                      </td>
                      <td className="font-mono text-xs">
                        <div className="text-ink-200">{c.mac_address}</div>
                        <div className="text-ink-400">{c.ip_address}</div>
                      </td>
                      <td>
                        {pkg ? (
                          <div>
                            <div className="text-white">{pkg.name}</div>
                            <div className="text-xs text-ink-400">{pkg.speed_mbps} Mbps</div>
                          </div>
                        ) : <span className="text-ink-400">—</span>}
                      </td>
                      <td>
                        <div className="text-ink-200">{formatDate(c.expiry_date)}</div>
                        {days !== null && (
                          <div className={`text-xs ${days < 0 ? 'text-rose-300' : days <= 3 ? 'text-amber-300' : 'text-ink-400'}`}>
                            {days < 0 ? `${-days} day(s) ago` : `in ${days} day(s)`}
                          </div>
                        )}
                      </td>
                      <td><span className={statusBadgeClass(c.status)}>{c.status}</span></td>
                      <td className="text-right whitespace-nowrap">
                        <button onClick={() => openEdit(c)} className="btn-ghost py-1.5 px-2"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => onDelete(c)} className="btn-ghost py-1.5 px-2 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title={editing ? 'Edit Customer' : 'Add Customer'}
        subtitle="Fiber subscriber details"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="input-label">Full name *</label>
            <input required className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <label className="input-label">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="input-label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="input-label">CNIC</label>
            <input className="input" value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} />
          </div>
          <div>
            <label className="input-label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="input-label">Address</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="input-label">MAC address *</label>
            <input required pattern="^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$"
              placeholder="AA:BB:CC:DD:EE:FF"
              className="input font-mono" value={form.mac_address} onChange={(e) => setForm({ ...form, mac_address: e.target.value })} />
          </div>
          <div>
            <label className="input-label">IP address *</label>
            <input required placeholder="192.168.10.100" className="input font-mono" value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} />
          </div>
          <div>
            <label className="input-label">Package</label>
            <select className="input" value={form.package_id} onChange={(e) => setForm({ ...form, package_id: e.target.value })}>
              <option value="">— None —</option>
              {packages.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.speed_mbps} Mbps · Rs.{p.price_pkr}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Expiry date *</label>
            <input required type="date" className="input" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="input-label">Notes</label>
            <textarea rows={2} className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpenModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
