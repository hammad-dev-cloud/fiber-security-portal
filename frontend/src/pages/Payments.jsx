import { useEffect, useState } from 'react'
import { Plus, Trash2, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import { paymentApi, customerApi, packageApi } from '../api'
import Modal from '../components/Modal'
import Loader from '../components/Loader'
import { formatPKR, formatDateTime, statusBadgeClass } from '../utils/format'

const EMPTY = {
  customer_id: '', package_id: '', amount_pkr: 0,
  payment_method: 'cash', transaction_id: '',
  period_start: '', period_end: '', status: 'paid', notes: '',
}

export default function Payments() {
  const [rows, setRows]         = useState([])
  const [customers, setCustomers] = useState([])
  const [packages, setPackages] = useState([])
  const [loading, setLoading]   = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [p, c, pk] = await Promise.all([paymentApi.list(), customerApi.list(), packageApi.list()])
      setRows(p); setCustomers(c); setPackages(pk)
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openCreate = () => {
    const today = new Date()
    const nextMonth = new Date(); nextMonth.setMonth(nextMonth.getMonth() + 1)
    setForm({
      ...EMPTY,
      period_start: today.toISOString().slice(0, 10),
      period_end:   nextMonth.toISOString().slice(0, 10),
    })
    setOpenModal(true)
  }

  // Auto-fill amount & period when package selected
  const onPackageSelect = (id) => {
    const pkg = packages.find((p) => p.id === Number(id))
    if (pkg) {
      const start = new Date()
      const end   = new Date(); end.setDate(end.getDate() + (pkg.duration_days || 30))
      setForm((f) => ({
        ...f,
        package_id:   id,
        amount_pkr:   pkg.price_pkr,
        period_start: start.toISOString().slice(0, 10),
        period_end:   end.toISOString().slice(0, 10),
      }))
    } else {
      setForm((f) => ({ ...f, package_id: id }))
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        customer_id: Number(form.customer_id),
        package_id:  form.package_id ? Number(form.package_id) : null,
        amount_pkr:  Number(form.amount_pkr),
      }
      await paymentApi.create(payload)
      toast.success('Payment recorded')
      setOpenModal(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const onDelete = async (p) => {
    if (!confirm('Delete this payment?')) return
    try { await paymentApi.remove(p.id); toast.success('Deleted'); load() }
    catch (err) { toast.error(err.message) }
  }

  const total = rows.reduce((sum, r) => sum + Number(r.amount_pkr || 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="card px-5 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-accent" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-ink-300 font-semibold">Total recorded</div>
            <div className="font-display text-xl font-bold text-white">{formatPKR(total)}</div>
          </div>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Record Payment</button>
      </div>

      <div className="card overflow-hidden fade-up">
        {loading ? <Loader label="Loading payments..." /> : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-ink-300">No payments recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Package</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Period</th>
                  <th>Paid on</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const cust = customers.find((c) => c.id === p.customer_id)
                  const pkg  = packages.find((k) => k.id === p.package_id)
                  return (
                    <tr key={p.id}>
                      <td className="text-white font-medium">{cust?.full_name || `#${p.customer_id}`}</td>
                      <td className="text-ink-200">{pkg?.name || '—'}</td>
                      <td className="font-display font-bold text-accent">{formatPKR(p.amount_pkr)}</td>
                      <td><span className="badge-neutral">{p.payment_method || '—'}</span></td>
                      <td className="text-xs text-ink-300">{p.period_start} → {p.period_end}</td>
                      <td className="text-xs text-ink-300">{formatDateTime(p.paid_at)}</td>
                      <td><span className={statusBadgeClass(p.status)}>{p.status}</span></td>
                      <td className="text-right"><button onClick={() => onDelete(p)} className="btn-ghost py-1.5 px-2 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Record Payment" subtitle="Adds a billing record and renews the customer's expiry date" maxWidth="max-w-2xl">
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="input-label">Customer *</label>
            <select required className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">— Select customer —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name} ({c.ip_address})</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Package</label>
            <select className="input" value={form.package_id} onChange={(e) => onPackageSelect(e.target.value)}>
              <option value="">— None —</option>
              {packages.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.speed_mbps} Mbps · Rs.{p.price_pkr}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Amount (PKR) *</label>
            <input required type="number" min="0" step="0.01" className="input" value={form.amount_pkr} onChange={(e) => setForm({ ...form, amount_pkr: e.target.value })} />
          </div>
          <div>
            <label className="input-label">Method</label>
            <select className="input" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="jazzcash">JazzCash</option>
              <option value="easypaisa">EasyPaisa</option>
              <option value="card">Card</option>
            </select>
          </div>
          <div>
            <label className="input-label">Transaction ID</label>
            <input className="input font-mono" value={form.transaction_id} onChange={(e) => setForm({ ...form, transaction_id: e.target.value })} />
          </div>
          <div>
            <label className="input-label">Period start *</label>
            <input required type="date" className="input" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
          </div>
          <div>
            <label className="input-label">Period end *</label>
            <input required type="date" className="input" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
          </div>
          <div>
            <label className="input-label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="paid">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option>
            </select>
          </div>
          <div className="md:col-span-2"><label className="input-label">Notes</label>
            <textarea rows={2} className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpenModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Record Payment'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
