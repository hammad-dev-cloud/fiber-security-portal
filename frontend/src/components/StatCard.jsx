import { ArrowUpRight } from 'lucide-react'

const accentMap = {
  cyan:    { bar: 'from-cyan-500 to-cyan-300',    text: 'text-cyan-300',    glow: 'shadow-glow-cyan' },
  accent:  { bar: 'from-accent to-emerald-300',   text: 'text-accent',      glow: 'shadow-glow-accent' },
  amber:   { bar: 'from-amber-500 to-amber-300',  text: 'text-amber-300',   glow: '' },
  rose:    { bar: 'from-rose-500 to-rose-300',    text: 'text-rose-300',    glow: '' },
  violet:  { bar: 'from-violet-500 to-violet-300',text: 'text-violet-300',  glow: '' },
}

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'cyan',
  trend,
  className = '',
}) {
  const a = accentMap[accent] || accentMap.cyan

  return (
    <div className={`stat-card group ${className}`}>
      {/* Accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${a.bar} opacity-60`} />

      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs uppercase tracking-wider text-ink-300 font-semibold">{label}</span>
        {Icon && (
          <div className={`w-9 h-9 rounded-lg bg-white/[0.05] flex items-center justify-center border border-white/[0.06] ${a.text}`}>
            <Icon className="w-4.5 h-4.5" strokeWidth={2} />
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="font-display text-3xl font-bold text-white tracking-tight tabular-nums">{value}</div>
        {trend !== undefined && (
          <div className={`text-xs font-semibold flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            <ArrowUpRight className={`w-3 h-3 ${trend < 0 && 'rotate-90'}`} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      {hint && <div className="text-xs text-ink-400 mt-2">{hint}</div>}
    </div>
  )
}
