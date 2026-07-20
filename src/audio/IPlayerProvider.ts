import type { Track, PlayerState } from '@shared/types'

export interface IPlayerProvider {
  /** Play a specific track (local) or resume current playback */
  play(track?: Track): Promise<void>
  /** Pause playback */
  pause(): void
  /** Resume playback */
  resume(): void
  /** Seek to a specific position in seconds */
  seek(position: number): void
  /** Set volume (0.0 to 1.0) */
  setVolume(volume: number): void
  /** Subscribe to state changes (position, duration, status, metadata, etc.) */
  onStateChange(callback: (state: Partial<PlayerState>) => void): () => void
  /** Optional next track control for independent players (e.g., YTM) */
  next?(): void
  /** Optional previous track control for independent players */
  prev?(): void
  /** Optional shuffle control */
  shuffle?(): void
  /** Optional repeat control */
  repeat?(): void
  /** Destroy instance and clean up listeners */
  destroy(): void
}
