import type { PlayerState } from '../../../../shared/types'
import type { IPlayerProvider } from './IPlayerProvider'

export class YTMPlayer implements IPlayerProvider {
  private listeners: Set<(state: Partial<PlayerState>) => void> = new Set()
  private unsubState: (() => void) | null = null

  constructor() {
    const yukinon = window.yukinon
    if (yukinon.ytm && yukinon.ytm.onStateUpdate) {
      this.unsubState = yukinon.ytm.onStateUpdate((info: any) => {
        // Translate YTM state to universal PlayerState
        this.emit({
          source: 'ytm',
          status: info.isPlaying ? 'playing' : 'paused',
          ytmInfo: { title: info.title, artist: info.artist },
          artwork: info.artwork,
          position: info.position,
          duration: info.duration
        })
      })
    }
  }

  private emit(state: Partial<PlayerState>) {
    for (const listener of this.listeners) {
      listener(state)
    }
  }

  onStateChange(callback: (state: Partial<PlayerState>) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  async play(): Promise<void> {
    window.yukinon.ytm.playPause?.() 
  }

  pause(): void {
    window.yukinon.ytm.pause?.()
  }

  resume(): void {
    window.yukinon.ytm.playPause?.()
  }

  seek(position: number): void {
    window.yukinon.ytm.seek?.(position)
  }

  setVolume(volume: number): void {
    window.yukinon.ytm.setVolume?.(volume)
  }

  next(): void {
    window.yukinon.ytm.next?.()
  }

  prev(): void {
    window.yukinon.ytm.prev?.()
  }

  shuffle(): void {
    window.yukinon.ytm.shuffle?.()
  }

  repeat(): void {
    window.yukinon.ytm.repeat?.()
  }

  destroy(): void {
    if (this.unsubState) this.unsubState()
    this.listeners.clear()
  }
}
