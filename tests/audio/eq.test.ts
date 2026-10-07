import { describe, it, expect } from 'vitest'
import { EQ_FREQUENCIES } from '@renderer/audio/AudioEngine'
import type { EQBands } from '@shared/types'

export const MIN_GAIN_DB = -12
export const MAX_GAIN_DB = 12

export function clampGain(gain: number, min = MIN_GAIN_DB, max = MAX_GAIN_DB): number {
  if (gain < min) return min
  if (gain > max) return max
  return gain
}

export function createFlatEQBands(): EQBands {
  return {
    32: 0,
    64: 0,
    125: 0,
    250: 0,
    500: 0,
    1000: 0,
    2000: 0,
    4000: 0,
    8000: 0,
    16000: 0
  }
}

describe('Audio Equalizer & EQ Bands', () => {
  describe('EQ_FREQUENCIES Specification', () => {
    it('contains exactly 10 standard audio frequency bands', () => {
      const expectedBands = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
      expect(EQ_FREQUENCIES).toEqual(expectedBands)
      expect(EQ_FREQUENCIES).toHaveLength(10)
    })

    it('contains strictly monotonically increasing frequencies', () => {
      for (let i = 1; i < EQ_FREQUENCIES.length; i++) {
        expect(EQ_FREQUENCIES[i]).toBeGreaterThan(EQ_FREQUENCIES[i - 1])
      }
    })

    it('covers sub-bass to air frequencies (32Hz to 16kHz)', () => {
      expect(EQ_FREQUENCIES[0]).toBe(32)
      expect(EQ_FREQUENCIES[EQ_FREQUENCIES.length - 1]).toBe(16000)
    })
  })

  describe('Gain Clamping Logic', () => {
    it('clamps values below minimum to -12 dB', () => {
      expect(clampGain(-12.1)).toBe(-12)
      expect(clampGain(-20)).toBe(-12)
      expect(clampGain(-100)).toBe(-12)
    })

    it('clamps values above maximum to +12 dB', () => {
      expect(clampGain(12.1)).toBe(12)
      expect(clampGain(18)).toBe(12)
      expect(clampGain(50)).toBe(12)
    })

    it('preserves values within the [-12, +12] range', () => {
      expect(clampGain(0)).toBe(0)
      expect(clampGain(-6)).toBe(-6)
      expect(clampGain(3.5)).toBe(3.5)
      expect(clampGain(-12)).toBe(-12)
      expect(clampGain(12)).toBe(12)
    })

    it('supports custom clamping bounds if provided', () => {
      expect(clampGain(-10, -6, 6)).toBe(-6)
      expect(clampGain(8, -6, 6)).toBe(6)
      expect(clampGain(2, -6, 6)).toBe(2)
    })
  })

  describe('EQBands Interface & Structure', () => {
    it('creates flat EQ bands with 0 dB gain for all 10 frequencies', () => {
      const flat = createFlatEQBands()
      EQ_FREQUENCIES.forEach((freq) => {
        expect(flat[freq as keyof EQBands]).toBe(0)
      })
    })

    it('has keys corresponding to every frequency in EQ_FREQUENCIES', () => {
      const flat = createFlatEQBands()
      const keys = Object.keys(flat).map(Number).sort((a, b) => a - b)
      expect(keys).toEqual([...EQ_FREQUENCIES].sort((a, b) => a - b))
    })

    it('allows valid gain values on all bands', () => {
      const customBands: EQBands = {
        32: 3,
        64: 2.5,
        125: 1,
        250: -1,
        500: -2,
        1000: 0,
        2000: 1.5,
        4000: 3,
        8000: 4.5,
        16000: 5
      }

      EQ_FREQUENCIES.forEach((freq) => {
        const gain = customBands[freq as keyof EQBands]
        expect(gain).toBeDefined()
        expect(clampGain(gain)).toBe(gain)
      })
    })
  })
})
