import { describe, it, expect } from 'vitest'
import { parseLRC, type LyricLine } from '../../src/renderer/src/lib/lyrics'

function getActiveLyricIndex(lyrics: LyricLine[], position: number, offset: number): number {
  const effectiveTime = Math.max(0, position + offset)
  let activeIndex = -1
  for (let i = 0; i < lyrics.length; i++) {
    if (effectiveTime >= lyrics[i].time) {
      activeIndex = i
    } else {
      break
    }
  }
  return activeIndex
}

describe('Lyrics Offset Calibration and Synchronization', () => {
  const sampleLrc = `
[00:10.00]First line of the song
[00:20.50]Second line after chorus
[00:35.00]Third line in the bridge
[00:50.00]Final outro lyric
`
  const lines = parseLRC(sampleLrc)

  it('parses synchronized LRC lines correctly', () => {
    expect(lines).toHaveLength(4)
    expect(lines[0].time).toBe(10)
    expect(lines[0].text).toBe('First line of the song')
    expect(lines[1].time).toBe(20.5)
    expect(lines[2].time).toBe(35)
    expect(lines[3].time).toBe(50)
  })

  it('returns -1 when audio position is before the first lyric with 0 offset', () => {
    const idx = getActiveLyricIndex(lines, 5.0, 0)
    expect(idx).toBe(-1)
  })

  it('identifies the correct active lyric when playback position matches line time', () => {
    expect(getActiveLyricIndex(lines, 10.0, 0)).toBe(0)
    expect(getActiveLyricIndex(lines, 15.0, 0)).toBe(0)
    expect(getActiveLyricIndex(lines, 20.5, 0)).toBe(1)
    expect(getActiveLyricIndex(lines, 34.9, 0)).toBe(1)
    expect(getActiveLyricIndex(lines, 35.0, 0)).toBe(2)
    expect(getActiveLyricIndex(lines, 55.0, 0)).toBe(3)
  })

  it('shifts active lyric earlier with positive calibration offset', () => {
    // At position 9.8s, normally no lyric is active (time 10.0s not reached)
    expect(getActiveLyricIndex(lines, 9.8, 0)).toBe(-1)

    // With +0.3s offset, effectiveTime = 10.1s, activating line 0
    expect(getActiveLyricIndex(lines, 9.8, 0.3)).toBe(0)

    // At position 20.2s, normally line 0 is active (line 1 is at 20.5s)
    expect(getActiveLyricIndex(lines, 20.2, 0)).toBe(0)

    // With +0.5s offset, effectiveTime = 20.7s, activating line 1
    expect(getActiveLyricIndex(lines, 20.2, 0.5)).toBe(1)
  })

  it('shifts active lyric later with negative calibration offset', () => {
    // At position 20.6s, line 1 (at 20.5s) is active with 0 offset
    expect(getActiveLyricIndex(lines, 20.6, 0)).toBe(1)

    // With -0.3s offset, effectiveTime = 20.3s, delaying activation to line 0
    expect(getActiveLyricIndex(lines, 20.6, -0.3)).toBe(0)

    // At position 10.2s, with -0.5s offset, effectiveTime = 9.7s < 10.0s -> index -1
    expect(getActiveLyricIndex(lines, 10.2, -0.5)).toBe(-1)
  })

  it('clamps effective time to 0 to prevent negative time indexing', () => {
    const idx = getActiveLyricIndex(lines, 0.2, -1.0)
    expect(idx).toBe(-1)
  })

  it('handles cumulative offsets and resets cleanly', () => {
    let offset = 0
    offset += 0.5
    offset += 0.1
    expect(Math.round(offset * 10) / 10).toBe(0.6)

    expect(getActiveLyricIndex(lines, 9.5, offset)).toBe(0)

    // Reset offset
    offset = 0
    expect(getActiveLyricIndex(lines, 9.5, offset)).toBe(-1)
  })
})
