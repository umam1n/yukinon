import { audioEngine } from './AudioEngine'
import type { PlayerState } from '../../../../shared/types'
import type { IPlayerProvider } from './IPlayerProvider'
import { getStreamUrl } from '../lib/subsonic'

export class SubsonicPlayer implements IPlayerProvider {
  private audioEl: HTMLAudioElement | null = null
  private listeners: Set<(state: Partial<PlayerState>) => void> = new Set()
  private lastPositionFloor = 0

  constructor() {
    this.audioEl = new Audio()
    this.audioEl.crossOrigin = 'anonymous'
    this.audioEl.preload = 'metadata'
    audioEngine.initialize()

    this.audioEl.ontimeupdate = () => {
      if (!this.audioEl) return
      const pos = Math.floor(this.audioEl.currentTime)
      if (this.lastPositionFloor !== pos) {
        this.lastPositionFloor = pos
        this.emit({ position: pos })
      }
    }

    this.audioEl.onloadedmetadata = () => {
      if (this.audioEl) this.emit({ duration: this.audioEl.duration })
    }

    this.audioEl.onended = () => {
      this.emit({ status: 'stopped' }) // Let orchestrator playNext()
    }

    this.audioEl.onerror = () => {
      console.error('[SubsonicPlayer] Stream error')
      this.emit({ status: 'stopped' })
    }
  }

  private emit(state: Partial<PlayerState>) {
    for (const listener of this.listeners) {
      listener({ ...state, source: 'subsonic' })
    }
  }

  onStateChange(callback: (state: Partial<PlayerState>) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  async play(subsonicTrackId?: string, info?: { title: string, artist: string, duration?: number, artwork?: string }): Promise<void> {
    if (!this.audioEl) return

    if (subsonicTrackId) {
      try {
        const streamUrl = await getStreamUrl(subsonicTrackId)
        audioEngine.connectLocalAudio(this.audioEl)
        this.audioEl.src = streamUrl
        
        this.emit({
          status: 'playing',
          currentTrackId: subsonicTrackId,
          duration: info?.duration || 0,
          subsonicInfo: info ? { title: info.title, artist: info.artist } : undefined,
          artwork: info?.artwork || null
        })
      } catch (err) {
        console.error('[SubsonicPlayer] Failed to get stream URL:', err)
        this.emit({ status: 'stopped' })
        return
      }
    }
    
    audioEngine.resume()
    try {
      await this.audioEl.play()
      this.emit({ status: 'playing' })
    } catch (err) {
      console.error('[SubsonicPlayer] Failed to play stream:', err)
      this.emit({ status: 'stopped' })
    }
  }

  pause(): void {
    if (this.audioEl) {
      this.audioEl.pause()
      audioEngine.suspend()
      this.emit({ status: 'paused' })
    }
  }

  resume(): void {
    audioEngine.resume()
    if (this.audioEl) {
      this.audioEl.play()
      this.emit({ status: 'playing' })
    }
  }

  seek(position: number): void {
    if (this.audioEl) {
      // Note: Seeking over HTTP streams may require the server to support Range requests.
      // Subsonic/Navidrome typically supports this for standard transcodes/formats.
      this.audioEl.currentTime = position
      this.lastPositionFloor = Math.floor(position)
      this.emit({ position: this.lastPositionFloor })
    }
  }

  setVolume(volume: number): void {
    audioEngine.setVolume(volume)
  }

  destroy(): void {
    this.listeners.clear()
    audioEngine.suspend()
    if (this.audioEl) {
      this.audioEl.pause()
      this.audioEl.src = ''
      this.audioEl = null
    }
  }
}
