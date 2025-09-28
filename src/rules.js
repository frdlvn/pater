/**
 * Pure rules utilities for quiet hours, rate limiting, and deduplication.
 * These functions are pure: callers provide current time and state.
 */

/**
 * Returns true if currentMinutes is within the quiet period [from,to) in minutes.
 * Supports periods that cross midnight.
 */
export function isInQuietHours (currentMinutes, fromMinutes, toMinutes) {
  if (fromMinutes === toMinutes) return true
  if (fromMinutes < toMinutes) return currentMinutes >= fromMinutes && currentMinutes < toMinutes
  return currentMinutes >= fromMinutes || currentMinutes < toMinutes
}

/**
 * Utility to convert HH:MM to minutes since midnight.
 */
export function hhmmToMinutes (hhmm) {
  const [h, m] = String(hhmm).split(':').map((v) => Number(v))
  const hours = Number.isFinite(h) ? h : 0
  const mins = Number.isFinite(m) ? m : 0
  return (hours * 60) + mins
}

/**
 * Returns true if adding one more notification would exceed the max allowed within windowMs.
 */
export function isRateLimited (nowMs, history, windowMs, maxAllowed) {
  const cutoff = nowMs - windowMs
  const recent = (history ?? []).filter((h) => (h?.ts ?? 0) >= cutoff)
  return recent.length >= maxAllowed
}

/**
 * Returns true if a notification with the same dedupeKey exists within ttlMs.
 */
export function isDeduped (nowMs, history, dedupeKey, ttlMs) {
  if (!dedupeKey) return false
  const cutoff = nowMs - ttlMs
  return (history ?? []).some((h) => (h?.ts ?? 0) >= cutoff && h?.dedupeKey === dedupeKey)
}

/**
 * Append a record and keep the tail up to maxRecords.
 */
export function recordNotification (history, id, dedupeKey, nowMs, maxRecords) {
  const next = [...(history ?? []), { id, dedupeKey, ts: nowMs }]
  if (next.length <= maxRecords) return next
  return next.slice(next.length - maxRecords)
}


