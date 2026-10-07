import { describe, it, expect } from 'vitest'
import { AUTOEQ_PROFILES } from '../../src/renderer/src/data/autoeq'

const REQUIRED_OCTAVE_BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]

describe('AutoEQ Headphone Database Calibration Profiles', () => {
  it('contains at least 25 calibrated headphone profiles', () => {
    expect(AUTOEQ_PROFILES.length).toBeGreaterThanOrEqual(25)
  })

  it('includes key reference brands and models', () => {
    const names = AUTOEQ_PROFILES.map((p) => `${p.brand} ${p.model}`)
    expect(names.some((n) => n.includes('Sennheiser HD 600'))).toBe(true)
    expect(names.some((n) => n.includes('Sony WH-1000XM4'))).toBe(true)
    expect(names.some((n) => n.includes('Apple AirPods Pro 2'))).toBe(true)
    expect(names.some((n) => n.includes('Audio-Technica ATH-M50x'))).toBe(true)
    expect(names.some((n) => n.includes('Beyerdynamic DT 770 Pro'))).toBe(true)
    expect(names.some((n) => n.includes('Moondrop Blessing 2'))).toBe(true)
    expect(names.some((n) => n.includes('HiFiMAN Sundara'))).toBe(true)
    expect(names.some((n) => n.includes('AKG K371'))).toBe(true)
    expect(names.some((n) => n.includes('7Hz Timeless'))).toBe(true)
  })

  it('ensures each profile contains all 10 standard octave bands with gain in [-15, 15] dB', () => {
    AUTOEQ_PROFILES.forEach((profile) => {
      expect(profile.name).toBeDefined()
      expect(profile.brand).toBeDefined()
      expect(profile.model).toBeDefined()
      expect(profile.source).toBeDefined()

      REQUIRED_OCTAVE_BANDS.forEach((freq) => {
        const gain = profile.bands[freq as keyof typeof profile.bands]
        expect(gain).toBeDefined()
        expect(typeof gain).toBe('number')
        expect(gain).toBeGreaterThanOrEqual(-15)
        expect(gain).toBeLessThanOrEqual(15)
      })
    })
  })
})
