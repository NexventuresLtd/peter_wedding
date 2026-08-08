import type { Lang } from './types'

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(value < 10 && exponent > 0 ? 1 : 0)} ${units[exponent]}`
}

export function formatDateTime(iso: string, lang: Lang = 'en'): string {
  return new Date(iso).toLocaleString(lang === 'rw' ? 'rw-RW' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.35],
  ['month', 12],
  ['year', Infinity],
]

export function timeAgo(iso: string, lang: Lang = 'en'): string {
  const formatter = new Intl.RelativeTimeFormat(lang === 'rw' ? 'rw' : 'en', {
    numeric: 'auto',
  })
  let delta = (Date.now() - new Date(iso).getTime()) / 1000

  for (const [unit, step] of RELATIVE_STEPS) {
    if (Math.abs(delta) < step) return formatter.format(-Math.round(delta), unit)
    delta /= step
  }
  return formatter.format(-Math.round(delta), 'year')
}

/** Days until the wedding, or null when no date is configured / it has passed. */
export function daysUntil(dateString: string): number | null {
  if (!dateString) return null
  const target = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  return days >= 0 ? days : null
}

export function formatWeddingDate(dateString: string, lang: Lang): string | null {
  if (!dateString) return null
  const date = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleDateString(lang === 'rw' ? 'rw-RW' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** camelCase theme token -> the CSS variable name Tailwind reads. */
export function cssVarName(token: string): string {
  return `--c-${token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`
}

/**
 * "#0F4C3A" -> "15 76 58".
 *
 * Tailwind's opacity modifiers (bg-primary/10) need the channels on their own
 * so it can splice in an alpha value. Themes are stored as hex because that is
 * what the admin's colour picker speaks, so the conversion happens here.
 * Returns null for anything that is not a 3- or 6-digit hex colour.
 */
export function hexToRgbChannels(hex: string): string | null {
  const match = /^#?([\da-f]{3}|[\da-f]{6})$/i.exec(hex.trim())
  if (!match) return null

  let digits = match[1]
  if (digits.length === 3) {
    digits = digits
      .split('')
      .map((digit) => digit + digit)
      .join('')
  }

  const value = Number.parseInt(digits, 16)
  return `${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255}`
}

export function classNames(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ')
}
