// Shared types used by both main and renderer processes

export type TrackSource = 'local' | 'ytm' | 'radio' | 'subsonic' | 'jellyfin'

export type ContentType = 'music' | 'instrumental' | 'live' | 'asmr' | 'podcast' | 'soundtrack'

export interface Track {
  id: string
  source: TrackSource
  path?: string // Optional for remote sources
  streamUrl?: string // Optional for local sources
  title: string
  artist: string
  album?: string
  albumArtist?: string
  year?: number
  genre?: string
  duration?: number // seconds, optional for radio
  artwork?: string // base64 data URL or remote URL
  format?: string // e.g. "flac", "mp3", "wav"
  bitDepth?: number
  sampleRate?: number
  bitrate?: number
  playCount?: number
  isFavorite?: boolean
  contentType?: ContentType
  isInstrumental?: boolean
  isLive?: boolean
  mood?: string
  aiTags?: string[]
  replaygainTrackGain?: number | null
  replaygainTrackPeak?: number | null
}

export type PlaylistType = 'static' | 'smart'

export interface SmartPlaylistRule {
  field: 'content_type' | 'mood' | 'genre' | 'is_instrumental' | 'is_live' | 'year' | 'bitrate' | 'play_count' | 'artist' | 'album'
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in'
  value: string | number | boolean | string[]
}

export interface Playlist {
  id: string
  name: string
  trackIds?: string[]
  createdAt: string
  type?: PlaylistType
  ruleJson?: string
  sqlFilter?: string
  icon?: string
  trackCount?: number
}

export interface EQBands {
  32: number
  64: number
  125: number
  250: number
  500: number
  1000: number
  2000: number
  4000: number
  8000: number
  16000: number
}

export interface EQPreset {
  id: string
  name: string
  bands: EQBands
  isLocal?: boolean
}

export interface DeviceProfile {
  id: number
  deviceLabel: string
  presetId: string | null
  presetName: string | null
  bands: EQBands
}

export interface CommunityPreset {
  id: string
  title: string
  authorName: string
  deviceModel: string | null
  genre: string | null
  bands: EQBands
  upvotes: number
  createdAt: string
}

export interface AppTheme {
  mode: 'dark' | 'light'
  accentColor: string  // hex
  accent2Color: string // hex
}

export interface PlayerState {
  source: 'local' | 'ytm' | 'radio' | 'subsonic' | 'jellyfin'
  status: 'playing' | 'paused' | 'stopped'
  currentTrackId: string | null
  position: number
  duration: number
  volume: number
  artwork?: string | null
  ytmInfo?: { title: string; artist: string }
  radioInfo?: { title: string; station: string }
  subsonicInfo?: { title: string; artist: string }
  jellyfinInfo?: { title: string; artist: string }
  shuffle: boolean
  repeat: 'off' | 'all' | 'one'
}

export type IpcChannels =
  | 'library:scan'
  | 'library:getTracks'
  | 'library:getTrack'
  | 'library:getTrackArtwork'
  | 'playback:play'
  | 'playback:pause'
  | 'playback:stop'
  | 'playback:seek'
  | 'playback:setVolume'
  | 'eq:getBands'
  | 'eq:setBand'
  | 'eq:applyPreset'
  | 'eq:getPresets'
  | 'eq:savePreset'
  | 'eq:deletePreset'
  | 'devices:list'
  | 'devices:getProfile'
  | 'devices:saveProfile'
  | 'ytm:navigate'
  | 'ytm:show'
  | 'ytm:hide'
  | 'ytm:playPause'
  | 'ytm:next'
  | 'ytm:prev'
  | 'ytm:pause'
  | 'ytm:setVolume'
  | 'ytm:seek'
  | 'theme:get'
  | 'theme:set'
  | 'library:updateTags'

export interface TagUpdatePayload {
  trackId: string
  filePath: string
  tags: {
    title?: string
    artist?: string
    album?: string
    albumArtist?: string
    year?: number
    genre?: string
    trackNumber?: number
  }
}
