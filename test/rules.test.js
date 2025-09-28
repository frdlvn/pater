import { describe, it, expect } from 'vitest'
import { isInQuietHours, hhmmToMinutes, isRateLimited, isDeduped, recordNotification } from '../src/rules.js'

describe('rules', () => {
  it('hhmmToMinutes', () => {
    expect(hhmmToMinutes('00:00')).toBe(0)
    expect(hhmmToMinutes('01:30')).toBe(90)
    expect(hhmmToMinutes('23:59')).toBe(23 * 60 + 59)
  })

  it('isInQuietHours within same day', () => {
    const from = hhmmToMinutes('22:00')
    const to = hhmmToMinutes('23:00')
    expect(isInQuietHours(hhmmToMinutes('21:59'), from, to)).toBe(false)
    expect(isInQuietHours(hhmmToMinutes('22:00'), from, to)).toBe(true)
    expect(isInQuietHours(hhmmToMinutes('22:30'), from, to)).toBe(true)
    expect(isInQuietHours(hhmmToMinutes('23:00'), from, to)).toBe(false)
  })

  it('isInQuietHours crossing midnight', () => {
    const from = hhmmToMinutes('22:00')
    const to = hhmmToMinutes('08:00')
    expect(isInQuietHours(hhmmToMinutes('21:00'), from, to)).toBe(false)
    expect(isInQuietHours(hhmmToMinutes('23:00'), from, to)).toBe(true)
    expect(isInQuietHours(hhmmToMinutes('07:59'), from, to)).toBe(true)
    expect(isInQuietHours(hhmmToMinutes('08:00'), from, to)).toBe(false)
  })

  it('isRateLimited windowed count', () => {
    const now = 1_000_000
    const windowMs = 2 * 60 * 60 * 1000
    const hist = [
      { ts: now - windowMs + 1 },
      { ts: now - 10_000 },
      { ts: now - 1_000 }
    ]
    expect(isRateLimited(now, hist, windowMs, 3)).toBe(true)
    expect(isRateLimited(now, hist, windowMs, 4)).toBe(false)
  })

  it('isDeduped by key and ttl', () => {
    const now = Date.now()
    const ttl = 30 * 60 * 1000
    const hist = [
      { ts: now - ttl - 1, dedupeKey: 'x' },
      { ts: now - 10_000, dedupeKey: 'y' }
    ]
    expect(isDeduped(now, hist, 'x', ttl)).toBe(false)
    expect(isDeduped(now, hist, 'y', ttl)).toBe(true)
    expect(isDeduped(now, hist, undefined, ttl)).toBe(false)
  })

  it('recordNotification keeps tail', () => {
    const now = 123
    const hist = Array.from({ length: 10 }).map((_, i) => ({ id: String(i), ts: i }))
    const next = recordNotification(hist, 'x', 'k', now, 5)
    expect(next.length).toBe(5)
    expect(next[0].id).toBe('6')
    expect(next.at(-1).id).toBe('x')
  })
})


