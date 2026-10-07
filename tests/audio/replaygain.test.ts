import { describe, it, expect } from 'vitest'
import { calculateReplayGainTarget } from '../../src/renderer/src/audio/AudioEngine'

describe('ReplayGain (EBU R128) Math & Anti-Clipping', () => {
  it('returns 0 dB when ReplayGain is disabled', () => {
    const track = { replaygainTrackGain: -6.5, replaygainTrackPeak: 0.9 }
    const gain = calculateReplayGainTarget(track, 0, false)
    expect(gain).toBe(0)
  })

  it('returns 0 dB when track lacks ReplayGain tag', () => {
    const track = { replaygainTrackGain: null, replaygainTrackPeak: null }
    const gain = calculateReplayGainTarget(track, 0, true)
    expect(gain).toBe(0)
  })

  it('applies track gain directly with 0 dB preamp offset', () => {
    const track = { replaygainTrackGain: -7.2, replaygainTrackPeak: 0.8 }
    const gain = calculateReplayGainTarget(track, 0, true)
    expect(gain).toBeCloseTo(-7.2, 4)
  })

  it('adds preamp offset to track gain correctly', () => {
    const track = { replaygainTrackGain: -8.0, replaygainTrackPeak: 0.5 }
    const gain = calculateReplayGainTarget(track, 2.5, true)
    expect(gain).toBeCloseTo(-5.5, 4)
  })

  it('clamps gain to prevent clipping when target exceeds peak headroom', () => {
    const track = { replaygainTrackGain: -1.0, replaygainTrackPeak: 0.95 }
    const gain = calculateReplayGainTarget(track, 3.0, true)
    const expectedMax = -20 * Math.log10(0.95)
    expect(gain).toBeCloseTo(expectedMax, 4)
    expect(gain).toBeLessThan(2.0)
  })

  it('does not clamp if target gain is below max headroom', () => {
    const track = { replaygainTrackGain: -10.0, replaygainTrackPeak: 0.95 }
    const gain = calculateReplayGainTarget(track, 0, true)
    expect(gain).toBeCloseTo(-10.0, 4)
  })
})
