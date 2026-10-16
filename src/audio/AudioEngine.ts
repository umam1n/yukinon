import type { EQBands, Track } from '@shared/types'

export function calculateReplayGainTarget(
  track: Pick<Track, 'replaygainTrackGain' | 'replaygainTrackPeak'> | null | undefined,
  preampOffset = 0,
  enabled = true
): number {
  if (!enabled || !track || track.replaygainTrackGain === undefined || track.replaygainTrackGain === null) {
    return 0
  }
  let targetGain = (track.replaygainTrackGain ?? 0) + preampOffset
  if (track.replaygainTrackPeak && track.replaygainTrackPeak > 0) {
    const maxGainDb = -20 * Math.log10(track.replaygainTrackPeak)
    targetGain = Math.min(targetGain, maxGainDb)
  }
  return targetGain
}

const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const

class AudioEngine {
  private ctx: AudioContext | null = null
  private filters: BiquadFilterNode[] = []
  private preampGain: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private freqData: Uint8Array | null = null
  private masterGain: GainNode | null = null
  private localSources: Map<HTMLAudioElement, MediaElementAudioSourceNode> = new Map()

  initialize(): AudioContext {
    if (this.ctx) return this.ctx

    const AudioCtxClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new AudioCtxClass({ latencyHint: 'playback' })

    this.filters = EQ_FREQUENCIES.map((freq) => {
      const filter = this.ctx!.createBiquadFilter()
      filter.type = 'peaking'
      filter.frequency.value = freq
      filter.Q.value = 1.41
      filter.gain.value = 0
      return filter
    })

    for (let i = 0; i < this.filters.length - 1; i++) {
      this.filters[i].connect(this.filters[i + 1])
    }

    this.preampGain = this.ctx.createGain()
    this.preampGain.gain.value = 1.0

    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.8
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount)

    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0.8

    this.filters[this.filters.length - 1].connect(this.preampGain)
    this.preampGain.connect(this.analyser)
    this.analyser.connect(this.masterGain)
    this.masterGain.connect(this.ctx.destination)

    console.log('[AudioEngine] Initialized with', EQ_FREQUENCIES.length, 'EQ bands + AnalyserNode')
    return this.ctx
  }

  connectLocalAudio(audioEl: HTMLAudioElement): void {
    if (!this.ctx) this.initialize()

    if (this.localSources.has(audioEl)) {
      return
    }

    const source = this.ctx!.createMediaElementSource(audioEl)
    source.connect(this.filters[0])
    this.localSources.set(audioEl, source)
    console.log('[AudioEngine] Local audio connected to EQ chain')
  }

  setGain(bandIndex: number, gainDb: number): void {
    if (!this.filters[bandIndex] || !this.ctx) return
    this.filters[bandIndex].gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.01)
  }

  applyBands(bands: EQBands): void {
    if (!bands || !this.ctx) return
    const freqs = Object.keys(bands)
      .map(Number)
      .sort((a, b) => a - b)
    freqs.forEach((freq, i) => {
      if (this.filters[i]) {
        this.filters[i].gain.setTargetAtTime(bands[freq as keyof EQBands], this.ctx!.currentTime, 0.01)
      }
    })
  }

  setVolume(volume: number): void {
    if (!this.masterGain || !this.ctx) return
    const clamped = Math.max(0, Math.min(1, volume))
    this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.02)
  }

  setPreampGain(dbValue: number): void {
    if (!this.preampGain || !this.ctx) return
    const multiplier = Math.pow(10, dbValue / 20)
    this.preampGain.gain.setTargetAtTime(multiplier, this.ctx.currentTime, 0.05)
  }

  applyReplayGain(
    track: Pick<Track, 'replaygainTrackGain' | 'replaygainTrackPeak'> | null | undefined,
    preampOffset = 0,
    enabled = true
  ): void {
    const targetGain = calculateReplayGainTarget(track, preampOffset, enabled)
    this.setPreampGain(targetGain)
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.freqData) return null
    this.analyser.getByteFrequencyData(this.freqData as any)
    return this.freqData
  }

  getOctaveBandLevels(): number[] {
    const data = this.getFrequencyData()
    if (!data || !this.ctx) return EQ_FREQUENCIES.map(() => 0)
    const nyquist = this.ctx.sampleRate / 2
    const binCount = data.length

    return EQ_FREQUENCIES.map((freq) => {
      const lowFreq = freq / 1.414
      const highFreq = Math.min(nyquist, freq * 1.414)
      const startBin = Math.max(0, Math.floor((lowFreq / nyquist) * binCount))
      const endBin = Math.min(binCount - 1, Math.ceil((highFreq / nyquist) * binCount))
      let sum = 0
      let count = 0
      for (let b = startBin; b <= endBin; b++) {
        sum += data[b]
        count++
      }
      return count > 0 ? sum / (count * 255) : 0
    })
  }

  suspend(): void {}

  async resume(): Promise<void> {
    if (this.ctx && (this.ctx.state === 'suspended' || (this.ctx.state as string) === 'interrupted')) {
      try {
        await this.ctx.resume()
      } catch (err) {
        console.error('[AudioEngine] Failed to resume audio context:', err)
      }
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
