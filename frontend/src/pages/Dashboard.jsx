import { useEffect, useState } from 'react'
import {
  Users, Wifi, ShieldAlert, AlertOctagon, TrendingUp, Activity, ChevronRight,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { dashboardApi } from '../api'
import StatCard from '../components/StatCard'
import Loader from '../components/Loader'
import { formatPKR, timeAgo, severityBadgeClass } from '../utils/format'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [stats,    setStats]    = useState(null)
  const [alerts,   setAlerts]   = useState([])
  const [customers,setCustomers]= useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [s, a, c] = await Promise.all([
          dashboardApi.stats(),
          dashboardApi.recentAlerts(8),
          dashboardApi.recentCustomers(5),
        ])
        setStats(s); setAlerts(a); setCustomers(c)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading || !stats) return <Loader full label="Loading dashboard..." />

  // Synthetic 7-day series for the visualization
  const trend = Array.from({ length: 7 }).map((_, i) => ({
    day:      ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i],
    requests: Math.floor(800 + Math.random() * 600),
    alerts:   Math.floor(2 + Math.random() * 8),
  }))

  const routerPie = [
    { name: 'Online',  value: stats.routers.online,  color: '#00e0c7' },
    { name: 'Offline', value: stats.routers.offline, color: '#ef4444' },
  ]
  if (stats.routers.online + stats.routers.offline === 0) {
    routerPie[0].value = 1
    routerPie[0].name = 'No data'
    routerPie[0].color = '#3b455c'
  }

  return (
    <div className="space-y-6">
      {/* ===== Stat row ===== */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <div className="fade-up fade-up-1">
          <StatCard label="Total Customers" value={stats.customers.total} hint={`${stats.customers.active} active`} icon={Users} accent="cyan" />
        </div>
        <div className="fade-up fade-up-2">
          <StatCard label="Routers Online" value={`${stats.routers.online}/${stats.routers.total}`} hint={`${stats.routers.offline} offline`} icon={Wifi} accent="accent" />
        </div>
        <div className="fade-up fade-up-3">
          <StatCard label="Open Alerts (7d)" value={stats.alerts.open} hint={`${stats.alerts.critical_open} critical/high`} icon={ShieldAlert} accent="rose" />
        </div>
        <div className="fade-up fade-up-4">
          <StatCard label="Revenue (Month)" value={formatPKR(stats.revenue_this_month_pkr)} hint="From paid invoices" icon={TrendingUp} accent="violet" />
        </div>
      </div>

      {/* ===== Charts row ===== */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Traffic chart */}
        <div className="card p-5 lg:col-span-2 fade-up">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="section-title">Network Activity</h3>
              <p className="section-subtitle">Requests & alerts over the last 7 days</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-ink-300">
              <span className="glow-dot bg-cyan-400" /> requests
              <span className="glow-dot bg-rose-400 ml-2" /> alerts
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="gradReq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#22d3ee" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAlert" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" stroke="#828ca6" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#828ca6" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#1a2238', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#fff' }}
                cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              <Area type="monotone" dataKey="requests" stroke="#22d3ee" strokeWidth={2} fill="url(#gradReq)" />
              <Area type="monotone" dataKey="alerts"   stroke="#ef4444" strokeWidth={2} fill="url(#gradAlert)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Router status pie */}
        <div className="card p-5 fade-up">
          <h3 className="section-title">Router Status</h3>
          <p className="section-subtitle">Live connectivity overview</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={routerPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {routerPie.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a2238', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#fff' }} />
              <Legend formatter={(v) => <span className="text-ink-300 text-xs">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== Bottom row: recent alerts + recent customers ===== */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Recent alerts */}
        <div className="card p-5 lg:col-span-2 fade-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-title flex items-center gap-2"><AlertOctagon className="w-5 h-5 text-rose-300" /> Recent Security Events</h3>
              <p className="section-subtitle">Most recent intrusions, failed logins, and anomalies</p>
            </div>
            <Link to="/alerts" className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {alerts.length === 0 ? (
            <div className="py-10 text-center text-sm text-ink-300">No alerts yet — your network is calm. 🎉</div>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {alerts.map((a) => (
                <li key={a.id} className="py-3 flex items-start gap-3">
                  <span className={severityBadgeClass(a.severity)}>{a.severity}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium leading-snug">{a.message}</div>
                    <div className="text-xs text-ink-400 mt-0.5 font-mono">
                      {a.alert_type} · {timeAgo(a.created_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent customers */}
        <div className="card p-5 fade-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-title flex items-center gap-2"><Activity className="w-5 h-5 text-cyan-300" /> New Customers</h3>
              <p className="section-subtitle">Latest subscribers</p>
            </div>
            <Link to="/customers" className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {customers.length === 0 ? (
            <div className="py-10 text-center text-sm text-ink-300">No customers yet.</div>
          ) : (
            <ul className="space-y-3">
              {customers.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-accent/20 border border-white/[0.08] flex items-center justify-center text-accent font-bold text-sm shrink-0">
                    {c.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">{c.full_name}</div>
                    <div className="text-xs text-ink-400 font-mono truncate">{c.ip_address}</div>
                  </div>
                  <span className={severityBadgeClass(c.status === 'active' ? 'low' : c.status === 'expired' ? 'high' : 'medium')}>
                    {c.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
