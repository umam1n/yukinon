import { createContext, useContext } from 'react'
import type { Track, EQBands, EQPreset, AppTheme, PlayerState } from '@shared/types'

export interface AppStore {
  // Library
  tracks: Track[]
  setTracks: (tracks: Track[]) => void

  // Player
  player: PlayerState
  setPlayer: (state: Partial<PlayerState>) => void
  play: (track: Track) => Promise<void>
  togglePlayPause: () => void
  playNext: () => void
  playPrev: () => void
  seekTo: (position: number) => void
  setVolume: (volume: number) => void
  queue: Track[]
  setQueue: (queue: Track[], startIndex?: number) => void
  addToQueue: (track: Track) => void
  removeFromQueue: (index: number) => void
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

  // Modules
  activeModules: { ytm: boolean; radio: boolean; subsonic: boolean; jellyfin: boolean }
  setActiveModules: (modules: Partial<{ ytm: boolean; radio: boolean; subsonic: boolean; jellyfin: boolean }>) => void

  // Notifications
  notification: { message: string; type: 'success' | 'error' } | null
  notify: (message: string, type?: 'success' | 'error') => void

  // Dialogs
  confirm: (options: { title: string; message: string; confirmText?: string; cancelText?: string; isDestructive?: boolean }) => Promise<boolean>
}

export const AppContext = createContext<AppStore | null>(null)

export function useApp(): AppStore {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
