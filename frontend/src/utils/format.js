// =========================================================================
//  Formatting helpers
// =========================================================================

export const formatPKR = (value) => {
  const n = Number(value || 0)
  return `Rs. ${n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export const formatDate = (d) => {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '—' }
}

export const formatDateTime = (d) => {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return '—' }
}

export const timeAgo = (d) => {
  if (!d) return '—'
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 60)        return 'just now'
  if (diff < 3600)      return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)     return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`
  return formatDate(d)
}

export const daysUntil = (d) => {
  if (!d) return null
  const diff = (new Date(d).getTime() - Date.now()) / (86400 * 1000)
  return Math.ceil(diff)
}

// =========================================================================
// Status / severity badge helpers
// =========================================================================
export const statusBadgeClass = (status) => {
  const s = (status || '').toLowerCase()
  if (['active', 'paid', 'online', 'resolved', 'success'].includes(s)) return 'badge-success'
  if (['expired', 'failed', 'offline', 'critical', 'high'].includes(s)) return 'badge-danger'
  if (['suspended', 'pending', 'medium', 'warning'].includes(s))        return 'badge-warn'
  if (['terminated', 'inactive', 'low'].includes(s))                    return 'badge-neutral'
  return 'badge-info'
}

export const severityBadgeClass = (severity) => {
  const s = (severity || '').toLowerCase()
  if (s === 'critical' || s === 'high') return 'badge-danger'
  if (s === 'medium')                   return 'badge-warn'
  if (s === 'low')                      return 'badge-info'
  return 'badge-neutral'
}
