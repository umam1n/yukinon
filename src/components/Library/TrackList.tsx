import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../../store/AppContext'
import { Music2, PlusCircle, ListPlus, ListEnd } from 'lucide-react'
import type { Track } from '@shared/types'
import AddToPlaylistModal from '../Playlists/AddToPlaylistModal'
import { calculateVirtualWindow } from '../../lib/virtualList'

function formatDuration(secs: number): string {
  if (!secs) return ''
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const ROW_HEIGHT = 58
const OVERSCAN = 12

export default function TrackList({ tracks, isQueueView }: { tracks: Track[], isQueueView?: boolean }): React.ReactElement {
  const { setQueue, player, removeFromQueue, playNextTrack, addToQueue } = useApp()
  const [trackToPlaylist, setTrackToPlaylist] = useState<Track | null>(null)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerWidth, setContainerWidth] = useState(600)
  const [viewportHeight, setViewportHeight] = useState(600)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    setViewportHeight(el.clientHeight || 600)
    setContainerWidth(el.clientWidth || 600)

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setViewportHeight(entry.contentRect.height)
        }
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width)
        }
      }
    })
    resizeObserver.observe(el)

    return () => resizeObserver.disconnect()
  }, [])

  const layoutMode: 'wide' | 'medium' | 'compact' =
    containerWidth >= 850 ? 'wide' : containerWidth >= 600 ? 'medium' : 'compact'

  const gridTemplate =
    layoutMode === 'wide'
      ? '40px 1fr 1fr 60px auto'
      : layoutMode === 'medium'
      ? '40px 1fr 60px auto'
      : '36px 1fr auto'

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const { startIndex, endIndex, paddingTop, paddingBottom } = calculateVirtualWindow(
    scrollTop,
    viewportHeight,
    tracks.length,
    ROW_HEIGHT,
    OVERSCAN
  )

  const visibleTracks = tracks.slice(startIndex, endIndex)

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ flex: 1, overflowY: 'auto', padding: '0 0 8px 0', position: 'relative' }}
    >
      {/* Sticky header row */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--bg)',
          display: 'grid',
          gridTemplateColumns: gridTemplate,
          gap: layoutMode === 'compact' ? 8 : 12,
          padding: layoutMode === 'compact' ? '8px 12px' : '8px 16px',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          borderBottom: '1px solid var(--border)',
          marginBottom: 4
        }}
      >
        <span style={{ textAlign: 'center' }}>#</span>
        <span>Title</span>
        {layoutMode === 'wide' && <span>Album</span>}
        {(layoutMode === 'wide' || layoutMode === 'medium') && (
          <span style={{ textAlign: 'right' }}>Time</span>
        )}
        <span></span>
      </div>

      {/* Top virtual spacer */}
      {paddingTop > 0 && <div style={{ height: paddingTop }} />}

      {/* Visible sliced items */}
      {visibleTracks.map((track, sliceIndex) => {
        const i = startIndex + sliceIndex
        const isPlaying = player.currentTrackId === track.id && player.status === 'playing'
        const isActive = player.currentTrackId === track.id
        const isSelected = selectedTrackId === track.id

        return (
          <div
            key={`${track.id}-${i}`}
            onClick={() => setSelectedTrackId(track.id)}
            onDoubleClick={() => setQueue(tracks, i)}
            className="track-row-compact"
            style={{
              display: 'grid',
              gridTemplateColumns: gridTemplate,
              gap: layoutMode === 'compact' ? 8 : 12,
              padding: layoutMode === 'compact' ? '8px 12px' : '10px 16px',
              alignItems: 'center',
              cursor: 'pointer',
              borderRadius: 10,
              margin: '1px 8px',
              background: isActive
                ? 'rgba(var(--color-accent-rgb), 0.12)'
                : isSelected
                ? 'rgba(var(--color-accent-rgb), 0.06)'
                : 'transparent',
              outline: isSelected && !isActive ? '1px solid rgba(var(--color-accent-rgb), 0.3)' : 'none',
              height: 56,
              boxSizing: 'border-box'
            }}
          >
            {/* Index / Playing indicator */}
            <div style={{
              fontSize: 12,
              color: isActive ? 'var(--color-accent)' : 'var(--text-dim)',
              fontFamily: 'JetBrains Mono, monospace',
              textAlign: 'center',
              fontWeight: isActive ? 700 : 500,
            }}>
              {isPlaying ? <span style={{ color: 'var(--color-accent)' }}>▶</span> : i + 1}
            </div>

            {/* Title + Artist + Format */}
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 14,
                fontWeight: 500,
                color: isActive ? 'var(--color-accent)' : 'var(--text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {track.title}
              </div>
              <div style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {track.artist}{track.format ? ` · ${track.format.toUpperCase()}` : ''}
              </div>
            </div>

            {/* Wide: Album column */}
            {layoutMode === 'wide' && (
              <div style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0
              }}>
                {track.album || '—'}
              </div>
            )}

            {/* Wide or Medium: separate duration column */}
            {(layoutMode === 'wide' || layoutMode === 'medium') && (
              <div style={{
                fontSize: 12,
                color: 'var(--text-dim)',
                fontFamily: 'JetBrains Mono, monospace',
                textAlign: 'right'
              }}>
                {formatDuration(track.duration || 0)}
              </div>
            )}

            {/* Right actions: duration (compact only) + action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, justifyContent: 'flex-end' }}>
              {layoutMode === 'compact' && (
                <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', marginRight: 4 }}>
                  {formatDuration(track.duration || 0)}
                </span>
              )}
              <button
                className="nowplaying-secondary-btn"
                onClick={(e) => { e.stopPropagation(); playNextTrack(track) }}
                title="Play Next"
                style={{ background: 'transparent', color: 'var(--text-dim)', border: 'none', cursor: 'pointer', padding: 8, minWidth: 36, minHeight: 36, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ListPlus size={16} />
              </button>
              <button
                className="nowplaying-secondary-btn"
                onClick={(e) => { e.stopPropagation(); addToQueue(track) }}
                title="Add to Queue"
                style={{ background: 'transparent', color: 'var(--text-dim)', border: 'none', cursor: 'pointer', padding: 8, minWidth: 36, minHeight: 36, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ListEnd size={16} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setTrackToPlaylist(track) }}
                title="Add to Playlist"
                style={{ background: 'transparent', color: 'var(--text-dim)', border: 'none', cursor: 'pointer', padding: 8, minWidth: 36, minHeight: 36, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <PlusCircle size={16} />
              </button>
              {isQueueView && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeFromQueue(i) }}
                  title="Remove from Queue"
                  style={{ background: 'transparent', color: 'var(--text-dim)', border: 'none', cursor: 'pointer', padding: 8, minWidth: 36, minHeight: 36, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              )}
            </div>
          </div>
        )
      })}

      {/* Bottom virtual spacer */}
      {paddingBottom > 0 && <div style={{ height: paddingBottom }} />}

      <AddToPlaylistModal track={trackToPlaylist} onClose={() => setTrackToPlaylist(null)} />
    </div>
  )
}
