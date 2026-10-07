export interface VirtualWindow {
  startIndex: number
  endIndex: number
  paddingTop: number
  paddingBottom: number
}

/**
 * Calculates the visible range and spacer heights for virtual list rendering.
 *
 * @param scrollTop Current scroll offset in pixels
 * @param viewportHeight Visible container height in pixels
 * @param totalCount Total number of items in the list
 * @param rowHeight Height of a single row in pixels
 * @param overscan Number of extra rows to render before and after the viewport
 */
export function calculateVirtualWindow(
  scrollTop: number,
  viewportHeight: number,
  totalCount: number,
  rowHeight: number,
  overscan = 12
): VirtualWindow {
  if (totalCount === 0 || rowHeight <= 0) {
    return { startIndex: 0, endIndex: 0, paddingTop: 0, paddingBottom: 0 }
  }

  const effectiveViewport = viewportHeight > 0 ? viewportHeight : 600
  const firstVisible = Math.floor(Math.max(0, scrollTop) / rowHeight)
  const visibleCount = Math.ceil(effectiveViewport / rowHeight)

  const startIndex = Math.max(0, firstVisible - overscan)
  const endIndex = Math.min(totalCount, firstVisible + visibleCount + overscan)

  const paddingTop = startIndex * rowHeight
  const paddingBottom = Math.max(0, (totalCount - endIndex) * rowHeight)

  return { startIndex, endIndex, paddingTop, paddingBottom }
}
