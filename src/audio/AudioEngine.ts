import type { EQBands } from '@shared/types'

const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const

/**
 * AudioEngine — singleton managing the Web Audio API graph.
 * 
 * Audio graph:
 *   [LocalSource / HowlerNode] ──┐
 *                                ├──► [EQ Filter Chain (10 bands)] ──► [GainNode] ──► Destination
 *   [YTM WebView capture]  ──────┘
 */
class AudioEngine {
  private ctx: AudioContext | null = null
  private filters: BiquadFilterNode[] = []
  private preampGain: GainNode | null = null
  private masterGain: GainNode | null = null
  private localSources: Map<HTMLAudioElement, MediaElementAudioSourceNode> = new Map()

  initialize(): AudioContext {
    if (this.ctx) return this.ctx

    this.ctx = new AudioContext({ latencyHint: 'playback', sampleRate: 48000 })

    // Create 10-band EQ filter chain
    this.filters = EQ_FREQUENCIES.map((freq) => {
      const filter = this.ctx!.createBiquadFilter()
      filter.type = 'peaking'
      filter.frequency.value = freq
      filter.Q.value = 1.41 // ≈ one-octave bandwidth
      filter.gain.value = 0
      return filter
    })

    // Chain the filters together
    for (let i = 0; i < this.filters.length - 1; i++) {
      this.filters[i].connect(this.filters[i + 1])
    }

    // Preamp and Master gain nodes
    this.preampGain = this.ctx.createGain()
    this.preampGain.gain.value = 1.0

    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0.8
    
    this.filters[this.filters.length - 1].connect(this.preampGain)
    this.preampGain.connect(this.masterGain)
    this.masterGain.connect(this.ctx.destination)

    console.log('[AudioEngine] Initialized with', EQ_FREQUENCIES.length, 'EQ bands')
    return this.ctx
  }

  connectLocalAudio(audioEl: HTMLAudioElement): void {
    if (!this.ctx) this.initialize()
    
    if (this.localSources.has(audioEl)) {
      return // Already created and connected
    }

    const source = this.ctx!.createMediaElementSource(audioEl)
    source.connect(this.filters[0])
    this.localSources.set(audioEl, source)
    console.log('[AudioEngine] Local audio connected to EQ chain')
  }

  setGain(bandIndex: number, gainDb: number): void {
    if (!this.filters[bandIndex]) return
    this.filters[bandIndex].gain.setTargetAtTime(gainDb, this.ctx!.currentTime, 0.01)
  }

  applyBands(bands: EQBands): void {
    const freqs = Object.keys(bands).map(Number).sort((a, b) => a - b)
    freqs.forEach((freq, i) => {
      if (this.filters[i]) {
        this.filters[i].gain.setTargetAtTime(bands[freq as keyof EQBands], this.ctx!.currentTime, 0.01)
      }
    })
  }

  setVolume(volume: number): void {
    if (!this.masterGain) return
    this.masterGain.gain.setTargetAtTime(volume, this.ctx!.currentTime, 0.02)
  }

  setPreampGain(dbValue: number): void {
    if (!this.preampGain) return
    // Convert dB to linear multiplier: 10^(db/20)
    // +5dB = 1.77x, -5dB = 0.56x
    const multiplier = Math.pow(10, dbValue / 20)
    this.preampGain.gain.setTargetAtTime(multiplier, this.ctx!.currentTime, 0.05)
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(console.error)
    }
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(console.error)
    }
  }

  getBandGains(): number[] {
    return this.filters.map((f) => f.gain.value)
  }

  getContext(): AudioContext | null {
    return this.ctx
  }
}

export const audioEngine = new AudioEngine()
export { EQ_FREQUENCIES }
