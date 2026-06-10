import { createContext, useContext } from 'react'
import type { Track, EQBands, EQPreset, AppTheme, PlayerState } from '../../../../shared/types'

export interface AppStore {
  // Library
  tracks: Track[]
  setTracks: (tracks: Track[]) => void

  // Player
  player: PlayerState
  setPlayer: (state: Partial<PlayerState>) => void
  playTrack: (track: Track) => Promise<void>
  playRadio: (url: string, info: { title: string, station: string, artwork?: string }) => Promise<void>
  playSubsonic: (id: string, info: { title: string, artist: string, duration?: number, artwork?: string }) => Promise<void>
  playJellyfin: (id: string, info: { title: string, artist: string, duration?: number, artwork?: string }) => Promise<void>
  togglePlayPause: () => void
  playNext: () => void
  playPrev: () => void
  seekTo: (position: number) => void
  setVolume: (volume: number) => void
  queue: Track[]
  setQueue: (queue: Track[], startIndex?: number) => void
  currentQueueIndex: number
  playbackMode: 'normal' | 'shuffle' | 'repeat-all' | 'repeat-one'
  togglePlaybackMode: () => void
  isSmartPlay: boolean
  toggleSmartPlay: () => void

  // EQ
  eqBands: EQBands
  setEqBand: (band: keyof EQBands, gain: number) => void
  applyEqPreset: (preset: EQPreset) => void
  eqPresets: EQPreset[]
  activePresetId: string
  setActivePresetId: (id: string) => void
  saveEqPreset: (name: string) => Promise<void>

  // Theme
  theme: AppTheme
  setTheme: (theme: Partial<AppTheme>) => void

  // Active view
  activeView: 'library' | 'ytm' | 'radio' | 'subsonic' | 'jellyfin' | 'eq' | 'presets' | 'settings' | 'playlists' | 'queue' | 'fullscreen'
  setActiveView: (view: AppStore['activeView']) => void
}

export const AppContext = createContext<AppStore | null>(null)

export function useApp(): AppStore {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
