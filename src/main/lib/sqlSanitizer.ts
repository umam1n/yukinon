/**
 * SQL Filter Sanitizer for Smart Playlists
 *
 * Prevents arbitrary SQL injection by restricting column identifiers to
 * allowed track fields and disallowing multi-statement or destructive keywords.
 */

export const ALLOWED_COLUMNS = new Set([
  'content_type',
  'is_instrumental',
  'is_live',
  'mood',
  'genre',
  'year',
  'bitrate',
  'duration',
  'play_count',
  'is_favorite',
  'artist',
  'album',
  'title',
  'format'
])

const FORBIDDEN_PATTERNS = [
  /;/g,
  /--/g,
  /\/\*/g,
  /\*\//g,
  /\b(drop|delete|insert|update|alter|create|exec|pragma|attach|detach|union|vacuum|into|values)\b/gi
]

export function sanitizeSqlFilter(rawFilter?: string): string {
  if (!rawFilter || typeof rawFilter !== 'string') {
    return '1=1'
  }

  let filter = rawFilter.trim()

  // Remove leading WHERE if present
  filter = filter.replace(/^WHERE\s+/i, '')

  if (!filter) return '1=1'

  // 1. Check for dangerous patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(filter)) {
      throw new Error(`Disallowed SQL pattern detected in smart playlist filter: ${pattern}`)
    }
  }

  // 2. Validate extracted identifiers
  // Tokenize words not in quotes or numbers
  const tokens = filter
    .replace(/'[^']*'/g, ' ') // strip string literals
    .replace(/[(),=<>!+*%/]/g, ' ') // strip punctuation/operators
    .split(/\s+/)
    .filter(Boolean)

  const allowedKeywords = new Set([
    'and', 'or', 'not', 'like', 'in', 'is', 'null', 'between', 'collate', 'nocase', '1'
  ])

  for (const token of tokens) {
    const lower = token.toLowerCase()
    // Numbers are allowed
    if (!isNaN(Number(lower))) continue

    if (!ALLOWED_COLUMNS.has(lower) && !allowedKeywords.has(lower)) {
      throw new Error(`Unrecognized column or keyword identifier in filter: ${token}`)
    }
  }

  return filter
}
