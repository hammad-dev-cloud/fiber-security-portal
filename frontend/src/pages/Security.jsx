import { useState } from 'react'
import { Radio, Search, ScanLine, Shield, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { securityApi } from '../api'

export default function Security() {
  // MAC verification
  const [macAddr, setMacAddr] = useState('')
  const [macIp, setMacIp]     = useState('')
  const [macResult, setMacResult] = useState(null)
  const [macLoading, setMacLoading] = useState(false)

  // Port scan
  const [host, setHost]   = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [scanLoading, setScanLoading] = useState(false)

  // Suspicious IPs
  const [susp, setSusp] = useState(null)
  const [suspLoading, setSuspLoading] = useState(false)

  const onVerifyMac = async (e) => {
    e.preventDefault()
    setMacLoading(true); setMacResult(null)
    try {
      const r = await securityApi.verifyMac({ mac_address: macAddr, ip_address: macIp || null })
      setMacResult(r)
    } catch (err) { toast.error(err.message) }
    finally { setMacLoading(false) }
  }

  const onPortScan = async (e) => {
    e.preventDefault()
    setScanLoading(true); setScanResult(null)
    try { setScanResult(await securityApi.portScan(host)) }
    catch (err) { toast.error(err.message) }
    finally { setScanLoading(false) }
  }

  const onCheckSuspicious = async () => {
    setSuspLoading(true); setSusp(null)
    try { setSusp(await securityApi.suspiciousIps()) }
    catch (err) { toast.error(err.message) }
    finally { setSuspLoading(false) }
  }

  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
      {/* ===== MAC Verification ===== */}
      <div className="card p-5 fade-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 flex items-center justify-center">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="section-title">MAC Verification</h3>
            <p className="section-subtitle">Verify a device against registered customers</p>
          </div>
        </div>

        <form onSubmit={onVerifyMac} className="space-y-3">
          <div>
            <label className="input-label">MAC address *</label>
            <input required pattern="^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$"
              className="input font-mono" placeholder="AA:BB:CC:DD:EE:FF"
              value={macAddr} onChange={(e) => setMacAddr(e.target.value)} />
          </div>
          <div>
            <label className="input-label">IP address (optional)</label>
            <input className="input font-mono" placeholder="192.168.10.100"
              value={macIp} onChange={(e) => setMacIp(e.target.value)} />
          </div>
          <button type="submit" disabled={macLoading} className="btn-primary w-full">
            <Search className="w-4 h-4" /> {macLoading ? 'Verifying...' : 'Verify MAC'}
          </button>
        </form>

        {macResult && (
          <div className={`mt-4 p-4 rounded-lg border ${macResult.is_authorized ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
            <div className="flex items-center gap-2 mb-2">
              {macResult.is_authorized
                ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                : <XCircle className="w-5 h-5 text-rose-400" />}
              <span className={`font-semibold ${macResult.is_authorized ? 'text-emerald-300' : 'text-rose-300'}`}>
                {macResult.is_authorized ? 'Authorized device' : 'Unauthorized / suspect'}
              </span>
            </div>
            <p className="text-sm text-ink-200 leading-snug">{macResult.message}</p>
            {macResult.customer_name && (
              <div className="mt-3 text-xs space-y-1 font-mono">
                <div><span className="text-ink-400">Customer:</span> <span className="text-white">{macResult.customer_name}</span></div>
                <div><span className="text-ink-400">Expected IP:</span> <span className="text-white">{macResult.expected_ip || '—'}</span></div>
                {macResult.provided_ip && <div><span className="text-ink-400">Provided IP:</span> <span className={macResult.ip_matches ? 'text-emerald-300' : 'text-rose-300'}>{macResult.provided_ip}</span></div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== Port Scan ===== */}
      <div className="card p-5 fade-up fade-up-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center">
            <ScanLine className="w-5 h-5" />
          </div>
          <div>
            <h3 className="section-title">Port Scan (IDS demo)</h3>
            <p className="section-subtitle">Probe a host for commonly-open TCP ports</p>
          </div>
        </div>

        <form onSubmit={onPortScan} className="space-y-3">
          <div>
            <label className="input-label">Target host (IP or domain) *</label>
            <input required className="input font-mono" placeholder="192.168.1.1 or scanme.nmap.org"
              value={host} onChange={(e) => setHost(e.target.value)} />
          </div>
          <button type="submit" disabled={scanLoading} className="btn-primary w-full">
            <ScanLine className="w-4 h-4" /> {scanLoading ? 'Scanning... (may take 10s)' : 'Run Scan'}
          </button>
        </form>

        {scanResult && (
          <div className={`mt-4 p-4 rounded-lg border ${scanResult.suspicious ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
            <div className="flex items-center gap-2 mb-2">
              {scanResult.suspicious ? <AlertTriangle className="w-5 h-5 text-amber-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              <span className={`font-semibold ${scanResult.suspicious ? 'text-amber-300' : 'text-emerald-300'}`}>
                {scanResult.suspicious ? 'Suspicious — alert raised' : 'Looks normal'}
              </span>
            </div>
            <p className="text-sm text-ink-200">
              {scanResult.count} open port{scanResult.count !== 1 ? 's' : ''} found on <span className="font-mono">{scanResult.host}</span>
            </p>
            {scanResult.open_ports?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {scanResult.open_ports.map((p) => (
                  <span key={p} className="badge-warn font-mono">:{p}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== Suspicious IPs ===== */}
      <div className="card p-5 lg:col-span-2 fade-up fade-up-2">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="section-title">Suspicious IP Detection</h3>
              <p className="section-subtitle">Scan recent failed logins for brute-force patterns</p>
            </div>
          </div>
          <button onClick={onCheckSuspicious} disabled={suspLoading} className="btn-primary">
            {suspLoading ? 'Scanning...' : 'Run Detection'}
          </button>
        </div>

        {susp && (
          susp.length === 0 ? (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-300">No suspicious IPs detected in the recent window.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {susp.map((s, i) => (
                <div key={i} className="p-3 rounded-lg bg-rose-500/[0.06] border border-rose-500/20 flex items-center justify-between">
                  <span className="font-mono text-rose-300">{s.source_ip}</span>
                  <span className="badge-danger">{s.fail_count} failed attempts</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
