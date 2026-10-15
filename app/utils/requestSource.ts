/**
 * Wording for where a request came from (Activity log, Sharing register).
 */
import type { RequestDevice, RequestLocation } from '../services/activityLogApi'

/** "Juba, South Sudan", or the most that is known. */
export function placeLabel(l?: RequestLocation | null): string {
  if (!l) return 'Location not recorded'
  if (l.private) return 'Private network'
  const parts = [l.city, l.city && l.region && l.region !== l.city ? null : l.region, l.country].filter(Boolean)
  return parts.length ? parts.join(', ') : 'Location unknown'
}

/** Short form for a list row: "Juba, SS · MTN South Sudan". */
export function placeShort(l?: RequestLocation | null): string {
  if (!l) return ''
  if (l.private) return 'Private network'
  const where = [l.city, l.country].filter(Boolean).join(', ')
  return [where, l.provider].filter(Boolean).join(' · ')
}

/** The flag emoji of a two-letter country code. */
export function countryFlag(code?: string): string {
  if (!code || code.length !== 2) return ''
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1f1a5 + c.charCodeAt(0)))
}

export function deviceIcon(d?: RequestDevice | null): string {
  if (!d) return 'globe'
  if (d.kind === 'app' || d.type === 'tablet') return 'tablet'
  if (d.type === 'phone') return 'smartphone'
  return 'monitor'
}

export function deviceTypeLabel(d?: RequestDevice | null): string {
  if (!d) return ''
  if (d.kind === 'app') return 'WellReach app on a tablet'
  const labels: Record<string, string> = { desktop: 'Computer', phone: 'Phone', tablet: 'Tablet', bot: 'Automated program' }
  return (d.type && labels[d.type]) || 'Browser'
}

export function hasPoint(l?: RequestLocation | null): l is RequestLocation & { latitude: number; longitude: number } {
  return !!l && !l.private && typeof l.latitude === 'number' && typeof l.longitude === 'number'
}
