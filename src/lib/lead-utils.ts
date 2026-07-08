/**
 * Utility functions for Lead formatting and cleansing.
 */

export const cleanHTML = (html: string) => {
  if (!html) return ''
  return html
    .replace(/<!doctype[^>]*>/gi, '').replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\r\n/g, '\n').trim()
}

export const getInitials = (a?: string, b?: string) => ((a?.[0] || '') + (b?.[0] || '')).toUpperCase() || '??'

const _TZ = 'America/Denver'

export const fmtTime = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: _TZ })

export const fmtShort = (d: Date) => {
  const dStr = d.toLocaleDateString('en-US', { timeZone: _TZ })
  const todayStr = new Date().toLocaleDateString('en-US', { timeZone: _TZ })
  const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString('en-US', { timeZone: _TZ })
  if (dStr === todayStr) return fmtTime(d)
  if (dStr === yesterdayStr) return 'Yesterday'
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'short', timeZone: _TZ })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: _TZ })
}

export const fmtFull = (d: Date) =>
  d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: _TZ })
