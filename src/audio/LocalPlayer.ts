import { audioEngine } from './AudioEngine'
import type { Track, PlayerState } from '@shared/types'
import type { IPlayerProvider } from './IPlayerProvider'

export class LocalPlayer implements IPlayerProvider {
  private audioEl: HTMLAudioElement | null = null
  private listeners: Set<(state: Partial<PlayerState>) => void> = new Set()
  private lastPositionFloor = 0

  private currentObjectUrl: string | null = null

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
      this.emit({ status: 'stopped' }) // The orchestrator should listen for this to playNext
    }
  }

  private emit(state: Partial<PlayerState>) {
    for (const listener of this.listeners) {
      listener({ ...state, source: 'local' })
    }
  }

  onStateChange(callback: (state: Partial<PlayerState>) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private revokeObjectUrl() {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl)
      this.currentObjectUrl = null
    }
  }

  async play(track?: Track): Promise<void> {
    if (!this.audioEl) return

    if (track) {
      audioEngine.connectLocalAudio(this.audioEl)
      this.revokeObjectUrl()

      if (window.yukinon.platform === 'android') {
        if (track.path?.startsWith('indexeddb://')) {
          const trackId = track.path.replace('indexeddb://', '')
          try {
            const blob = await window.yukinon.library.getTrackBlob(trackId)
            if (blob) {
              this.currentObjectUrl = URL.createObjectURL(blob)
              this.audioEl.src = this.currentObjectUrl
            } else {
              this.audioEl.src = ''
            }
          } catch (e) {
            console.error('[LocalPlayer] Failed to load from IndexedDB:', e)
            this.audioEl.src = ''
          }
        } else {
          this.audioEl.src = track.path!
        }
      } else {
        this.audioEl.src = `yukinon://local/track?path=${encodeURIComponent(track.path!)}`
      }
      this.emit({
        currentTrackId: track.id,
        duration: track.duration,
        status: 'playing',
        artwork: null // Reset artwork, orchestrator will fetch it
      })
    }
    
    audioEngine.resume()
    try {
      await this.audioEl.play()
      this.emit({ status: 'playing' })
    } catch (err) {
      console.error('[LocalPlayer] Failed to play local file:', err)
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
    this.revokeObjectUrl()
    if (this.audioEl) {
      this.audioEl.pause()
      this.audioEl.src = ''
      this.audioEl = null
    }
  }
}
