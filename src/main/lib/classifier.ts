import type { ContentType } from '../../shared/types'

export interface TrackMetadataForClassification {
  title?: string
  artist?: string
  album?: string
  genre?: string
  path?: string
  duration?: number // in seconds
  bitrate?: number // in kbps (e.g. 128, 320) or bps
}

export interface ClassificationResult {
  contentType: ContentType
  isInstrumental: boolean
  isLive: boolean
  suggestedMood?: string
}

const ASMR_KEYWORDS = [
  'asmr',
  'whisper',
  'binaural',
  'tingles',
  'ear cleaning',
  'sleep aid',
  'roleplay'
]

const PODCAST_KEYWORDS = [
  'podcast',
  'episode',
  'interview',
  'audiobook'
]

const LIVE_KEYWORDS = [
  'live at',
  'live in',
  'in concert',
  'unplugged',
  'live session',
  'tour edition',
  '(live)',
  '[live]',
  ' - live'
]

const SOUNDTRACK_KEYWORDS = [
  'ost',
  'soundtrack',
  'original score',
  'vgm',
  'game score',
  'film score',
  'motion picture'
]

const INSTRUMENTAL_KEYWORDS = [
  'instrumental',
  'karaoke',
  'backing track',
  'bgm',
  'orchestral',
  'minus one',
  'score',
  'no vocals'
]

const INSTRUMENTAL_GENRES = [
  'classical',
  'ambient',
  'soundtrack',
  'score',
  'instrumental',
  'orchestral',
  'new age',
  'post-rock'
]

function hasAnyKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some((kw) => lower.includes(kw))
}

export function classifyTrack(meta: TrackMetadataForClassification): ClassificationResult {
  const title = meta.title || ''
  const artist = meta.artist || ''
  const album = meta.album || ''
  const genre = meta.genre || ''
  const path = meta.path || ''

  const combinedSearch = `${title} ${artist} ${album} ${genre} ${path}`.toLowerCase()
  const titleAndAlbum = `${title} ${album}`.toLowerCase()

  let contentType: ContentType = 'music'
  let isInstrumental = false
  let isLive = false
  let suggestedMood: string | undefined

  // 1. Check Live markers
  if (hasAnyKeyword(titleAndAlbum, LIVE_KEYWORDS)) {
    isLive = true
  }

  // 2. Check Instrumental markers
  if (
    hasAnyKeyword(titleAndAlbum, INSTRUMENTAL_KEYWORDS) ||
    hasAnyKeyword(genre, INSTRUMENTAL_GENRES)
  ) {
    isInstrumental = true
  }

  // 3. Normalize bitrate to kbps
  const bitrateKbps = meta.bitrate ? (meta.bitrate > 1000 ? Math.round(meta.bitrate / 1000) : meta.bitrate) : undefined

  // 4. Primary Content Type Determination (ordered by specificity)
  if (hasAnyKeyword(combinedSearch, ASMR_KEYWORDS)) {
    contentType = 'asmr'
    suggestedMood = 'calm'
  } else if (
    hasAnyKeyword(combinedSearch, PODCAST_KEYWORDS) ||
    ((meta.duration ?? 0) > 1800 && bitrateKbps !== undefined && bitrateKbps <= 128)
  ) {
    contentType = 'podcast'
    suggestedMood = 'informative'
  } else if (isLive) {
    contentType = 'live'
    suggestedMood = 'live'
  } else if (hasAnyKeyword(combinedSearch, SOUNDTRACK_KEYWORDS)) {
    contentType = 'soundtrack'
    suggestedMood = 'cinematic'
  } else if (isInstrumental) {
    contentType = 'instrumental'
    suggestedMood = 'focus'
  } else {
    contentType = 'music'
  }

  // 5. Secondary Mood Classification
  if (!suggestedMood) {
    if (hasAnyKeyword(combinedSearch, ['rock', 'metal', 'dance', 'edm', 'workout', 'upbeat', 'punk'])) {
      suggestedMood = 'energetic'
    } else if (hasAnyKeyword(combinedSearch, ['lofi', 'lo-fi', 'chill', 'ambient', 'relax', 'sleep', 'acoustic'])) {
      suggestedMood = 'chill'
    } else if (hasAnyKeyword(combinedSearch, ['classical', 'piano', 'study', 'focus'])) {
      suggestedMood = 'focus'
    } else if (hasAnyKeyword(combinedSearch, ['sad', 'melancholy', 'blues', 'ballad', 'sorrow', 'crying'])) {
      suggestedMood = 'melancholic'
    } else if (hasAnyKeyword(combinedSearch, ['happy', 'summer', 'party', 'fun'])) {
      suggestedMood = 'happy'
    } else {
      suggestedMood = 'chill'
    }
  }

  return {
    contentType,
    isInstrumental,
    isLive,
    suggestedMood
  }
}
