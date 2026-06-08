import { audioEngine } from './AudioEngine'
import type { PlayerState } from '../../../../shared/types'
import type { IPlayerProvider } from './IPlayerProvider'

export class RadioPlayer implements IPlayerProvider {
  private audioEl: HTMLAudioElement | null = null
  private listeners: Set<(state: Partial<PlayerState>) => void> = new Set()

  constructor() {
    this.audioEl = new Audio()
    // this.audioEl.crossOrigin = 'anonymous' // Removed to bypass CORS issues for radio streams
    this.audioEl.preload = 'metadata'
    audioEngine.initialize()

    this.audioEl.onplaying = () => {
      this.emit({ status: 'playing' })
    }

    this.audioEl.onpause = () => {
      this.emit({ status: 'paused' })
    }

    this.audioEl.onerror = () => {
      console.error('[RadioPlayer] Stream error')
      this.emit({ status: 'stopped' })
    }
  }

  private emit(state: Partial<PlayerState>) {
    for (const listener of this.listeners) {
      listener({ ...state, source: 'radio' })
    }
  }

  onStateChange(callback: (state: Partial<PlayerState>) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  async play(url?: string, stationInfo?: { title: string, station: string, artwork?: string }): Promise<void> {
    if (!this.audioEl) return

    if (url) {
      // audioEngine.connectLocalAudio(this.audioEl) // Bypass Web Audio API EQ for radio due to CORS
      this.audioEl.src = url
      this.emit({
        status: 'playing',
        radioInfo: stationInfo ? { title: stationInfo.title, station: stationInfo.station } : undefined,
        artwork: stationInfo?.artwork || null
      })
    }
    
    audioEngine.resume()
    try {
      await this.audioEl.play()
    } catch (err) {
      console.error('[RadioPlayer] Failed to play radio stream:', err)
      this.emit({ status: 'stopped' })
    }
  }

  pause(): void {
    if (this.audioEl) {
      this.audioEl.pause()
      audioEngine.suspend()
    }
  }

  resume(): void {
    audioEngine.resume()
    if (this.audioEl) {
      this.audioEl.play()
    }
  }

  seek(): void {
    // Cannot seek a live radio stream
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
