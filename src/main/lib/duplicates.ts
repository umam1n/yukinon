/**
 * Robust Cross-Album Duplicate Scanner
 *
 * Implements title & artist normalization, duration clustering, and
 * audio quality scoring to accurately group duplicates across singles,
 * albums, and remasters while eliminating false positives.
 */

export interface TrackForDuplicateAnalysis {
  id: string
  path?: string
  title?: string
  artist?: string
  duration?: number
  bitDepth?: number
  sampleRate?: number
  bitrate?: number
  format?: string
}

export interface DuplicateCluster<T> {
  primary: T
  duplicates: T[]
}

const REMASTER_PATTERNS = [
  /\b(20\d\d|19\d\d)?\s*remaster(ed)?(\s*(version|edition|\d{4}))?\b/gi,
  /\b(deluxe|expanded|anniversary|special|collector'?s?|tour|bonus)\s*(edition|version|release)?\b/gi,
  /\b(album|single|radio|extended|original|club|instrumental|vocal)\s*(version|mix|edit)\b/gi,
  /\bbonus\s*track\b/gi,
  /\b(mono|stereo)\s*(version|mix)?\b/gi,
  /\blive\s*(at|in|session)?\b/gi
]

function stripFeaturedArtists(text: string): string {
  return text
    .replace(/\s*[\(\[]\s*\b(feat|ft|featuring|with)(?:\.|\b)[^)\]]+[\)\]]/gi, ' ')
    .replace(/\s+\b(feat|ft|featuring|with)(?:\.|\b)\s+.+$/gi, ' ')
}

export function normalizeTitle(rawTitle: string): string {
  if (!rawTitle) return ''

  let title = rawTitle.trim()

  // 1. Strip leading track number prefixes like "01 - ", "02. ", "1 "
  title = title.replace(/^0?\d+[\s._-]+/, '')

  // 2. Strip featured artist mentions (feat. / ft. / with)
  title = stripFeaturedArtists(title)

  // 3. Strip remaster / edition markers
  for (const pattern of REMASTER_PATTERNS) {
    pattern.lastIndex = 0
    title = title.replace(pattern, ' ')
  }

  // 4. Strip empty/dangling brackets or parentheses resulting from removed words
  title = title.replace(/\(\s*\)/g, ' ').replace(/\[\s*\]/g, ' ')

  // 5. Strip accents, special characters, and punctuation
  title = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')

  // 6. Collapse consecutive whitespace and lowercase
  return title.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function normalizeArtist(rawArtist: string): string {
  if (!rawArtist) return ''

  let artist = rawArtist.trim()

  // 1. Strip leading "The "
  artist = artist.replace(/^the\s+/i, '')

  // 2. Strip featured artist mentions
  artist = stripFeaturedArtists(artist)

  // 3. Strip accents and punctuation
  artist = artist
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')

  // 4. Collapse whitespace and lowercase
  return artist.replace(/\s+/g, ' ').trim().toLowerCase()
}

/**
 * Checks whether two track durations match within clustering tolerance.
 * Tolerance: absolute delta <= 3.5 seconds OR relative delta < 3%.
 */
export function isDurationMatch(d1?: number | null, d2?: number | null): boolean {
  if (typeof d1 !== 'number' || typeof d2 !== 'number' || d1 <= 0 || d2 <= 0) {
    return false
  }

  const delta = Math.abs(d1 - d2)
  if (delta <= 3.5) return true

  const maxDuration = Math.max(d1, d2)
  if (maxDuration > 0 && delta / maxDuration < 0.03) {
    return true
  }

  return false
}

const LOSSLESS_FORMATS = new Set(['flac', 'wav', 'aiff', 'alac'])

/**
 * Calculates audio quality score where higher is better:
 * bitDepth * 1,000,000 + sampleRate * 10 + bitrate (+ 500,000 bonus for lossless).
 */
export function calculateTrackQualityScore(track: TrackForDuplicateAnalysis): number {
  const bitDepth = track.bitDepth || 16
  const sampleRate = track.sampleRate || 44100
  const bitrate = track.bitrate || 0
  const format = (track.format || '').toLowerCase()
  const isLossless = LOSSLESS_FORMATS.has(format) ? 500_000 : 0

  return bitDepth * 1_000_000 + sampleRate * 10 + bitrate + isLossless
}

/**
 * Clusters a list of tracks into duplicate groups.
 * In each group, the highest quality track is marked as primary, and the rest as duplicates.
 */
export function clusterDuplicateTracks<T extends TrackForDuplicateAnalysis>(
  tracks: T[]
): DuplicateCluster<T>[] {
  // First, group tracks by normalized (title, artist)
  const candidateGroups = new Map<string, T[]>()

  for (const track of tracks) {
    const normTitle = normalizeTitle(track.title || '')
    const normArtist = normalizeArtist(track.artist || '')
    if (!normTitle) continue

    const key = `${normTitle}||${normArtist}`
    let group = candidateGroups.get(key)
    if (!group) {
      group = []
      candidateGroups.set(key, group)
    }
    group.push(track)
  }

  const clusters: DuplicateCluster<T>[] = []

  // Next, for each candidate group, cluster by duration tolerance
  for (const [, candidates] of candidateGroups) {
    if (candidates.length <= 1) continue

    const durationBuckets: T[][] = []

    for (const track of candidates) {
      let placed = false
      for (const bucket of durationBuckets) {
        if (bucket.length > 0 && isDurationMatch(track.duration, bucket[0].duration)) {
          bucket.push(track)
          placed = true
          break
        }
      }
      if (!placed) {
        durationBuckets.push([track])
      }
    }

    // For every bucket with > 1 track, pick the best quality copy
    for (const bucket of durationBuckets) {
      if (bucket.length <= 1) continue

      const sortedByQuality = [...bucket].sort(
        (a, b) => calculateTrackQualityScore(b) - calculateTrackQualityScore(a)
      )

      clusters.push({
        primary: sortedByQuality[0],
        duplicates: sortedByQuality.slice(1)
      })
    }
  }

  return clusters
}
