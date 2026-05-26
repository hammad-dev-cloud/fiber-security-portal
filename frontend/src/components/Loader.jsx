import { Loader2 } from 'lucide-react'

export default function Loader({ label = 'Loading...', full = false }) {
  if (full) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
        <span className="text-sm text-ink-300">{label}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center gap-2 py-6 text-ink-300 text-sm">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>{label}</span>
    </div>
  )
}
