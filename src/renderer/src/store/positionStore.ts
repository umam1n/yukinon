import { useSyncExternalStore } from 'react'

/**
 * Playback position lives outside AppContext: it changes every second during playback,
 * and keeping it in context re-rendered every useApp() consumer (library, playlists, ...)
 * on each tick. Only components that display progress subscribe here.
 */

let position = 0
const listeners = new Set<() => void>()

export function setPlayerPosition(next: number): void {
  if (next === position) return
  position = next
  listeners.forEach((listener) => listener())
}

export function getPlayerPosition(): number {
  return position
}

export function subscribePlayerPosition(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePlayerPosition(): number {
  return useSyncExternalStore(subscribePlayerPosition, getPlayerPosition)
}
