import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, subtitle, children, maxWidth = 'max-w-lg' }) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm fade-up"
      onClick={onClose}
    >
      <div
        className={`card w-full ${maxWidth} relative animate-fade-up`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-bold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-ink-300 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-ink-300 hover:text-white p-1 rounded-md hover:bg-white/[0.06] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
