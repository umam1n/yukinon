import { describe, it, expect } from 'vitest'
import { calculateVirtualWindow } from '../../src/renderer/src/lib/virtualList'

describe('calculateVirtualWindow', () => {
  const ROW_HEIGHT = 56
  const VIEWPORT_HEIGHT = 560 // 10 rows visible
  const OVERSCAN = 12

  it('handles empty list correctly', () => {
    const window = calculateVirtualWindow(0, VIEWPORT_HEIGHT, 0, ROW_HEIGHT, OVERSCAN)
    expect(window).toEqual({
      startIndex: 0,
      endIndex: 0,
      paddingTop: 0,
      paddingBottom: 0
    })
  })

  it('handles invalid or zero row height', () => {
    const window = calculateVirtualWindow(0, VIEWPORT_HEIGHT, 100, 0, OVERSCAN)
    expect(window.startIndex).toBe(0)
    expect(window.endIndex).toBe(0)
  })

  it('renders entire small list without spacers if smaller than viewport + overscan', () => {
    const totalCount = 15
    const window = calculateVirtualWindow(0, VIEWPORT_HEIGHT, totalCount, ROW_HEIGHT, OVERSCAN)
    expect(window.startIndex).toBe(0)
    expect(window.endIndex).toBe(15)
    expect(window.paddingTop).toBe(0)
    expect(window.paddingBottom).toBe(0)
  })

  it('computes correct slice and bottom padding at scroll top = 0', () => {
    const totalCount = 100
    const window = calculateVirtualWindow(0, VIEWPORT_HEIGHT, totalCount, ROW_HEIGHT, OVERSCAN)
    // 0 first visible + 10 visible + 12 overscan = 22
    expect(window.startIndex).toBe(0)
    expect(window.endIndex).toBe(22)
    expect(window.paddingTop).toBe(0)
    expect(window.paddingBottom).toBe((100 - 22) * ROW_HEIGHT)
    // Total virtual height matches totalCount * ROW_HEIGHT
    expect(window.paddingTop + (window.endIndex - window.startIndex) * ROW_HEIGHT + window.paddingBottom).toBe(
      totalCount * ROW_HEIGHT
    )
  })

  it('computes correct slice with top and bottom spacers when scrolled to middle', () => {
    const totalCount = 100
    // Scrolled to row 40 (scrollTop = 40 * 56 = 2240)
    const scrollTop = 40 * ROW_HEIGHT
    const window = calculateVirtualWindow(scrollTop, VIEWPORT_HEIGHT, totalCount, ROW_HEIGHT, OVERSCAN)

    // firstVisible = 40, visibleCount = 10
    // startIndex = 40 - 12 = 28
    // endIndex = 40 + 10 + 12 = 62
    expect(window.startIndex).toBe(28)
    expect(window.endIndex).toBe(62)
    expect(window.paddingTop).toBe(28 * ROW_HEIGHT)
    expect(window.paddingBottom).toBe((100 - 62) * ROW_HEIGHT)
    expect(window.paddingTop + (window.endIndex - window.startIndex) * ROW_HEIGHT + window.paddingBottom).toBe(
      totalCount * ROW_HEIGHT
    )
  })

  it('clamps to totalCount and sets paddingBottom to 0 when scrolled to bottom', () => {
    const totalCount = 100
    // Scrolled to end
    const scrollTop = 90 * ROW_HEIGHT
    const window = calculateVirtualWindow(scrollTop, VIEWPORT_HEIGHT, totalCount, ROW_HEIGHT, OVERSCAN)

    expect(window.endIndex).toBe(100)
    expect(window.paddingBottom).toBe(0)
    expect(window.startIndex).toBe(90 - OVERSCAN)
    expect(window.paddingTop + (window.endIndex - window.startIndex) * ROW_HEIGHT + window.paddingBottom).toBe(
      totalCount * ROW_HEIGHT
    )
  })

  it('handles negative or bounce scrollTop gracefully', () => {
    const totalCount = 50
    const window = calculateVirtualWindow(-50, VIEWPORT_HEIGHT, totalCount, ROW_HEIGHT, OVERSCAN)
    expect(window.startIndex).toBe(0)
    expect(window.paddingTop).toBe(0)
  })
})
