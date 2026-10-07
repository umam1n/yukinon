import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useApp } from '../../store/AppContext'
import { Music2, PlusCircle, ListPlus, ListEnd, ArrowUp, ArrowDown, Play, Trash2 } from 'lucide-react'
import type { Track } from '../../../../../../shared/types'
import AddToPlaylistModal from '../Playlists/AddToPlaylistModal'
import { calculateVirtualWindow } from '../../lib/virtualList'

function formatDuration(secs: number): string {
  if (!secs) return ''
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const ROW_HEIGHT = 56
const OVERSCAN = 15

type SortKey = 'index' | 'title' | 'album' | 'format' | 'duration'
type SortOrder = 'asc' | 'desc'

interface ContextMenuState {
  x: number
  y: number
  track: Track
  index: number
}

export default function TrackList({
  tracks,
  isQueueView
}: {
  tracks: Track[]
  isQueueView?: boolean
}): React.ReactElement {
  const { setQueue, player, removeFromQueue, playNextTrack, addToQueue } = useApp()
  const [trackToPlaylist, setTrackToPlaylist] = useState<Track | null>(null)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerWidth, setContainerWidth] = useState(1000)
  const [viewportHeight, setViewportHeight] = useState(600)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    setViewportHeight(el.clientHeight || 600)
    setContainerWidth(el.clientWidth || 1000)

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
      ? '40px 40px 1fr 1fr 110px 60px 110px'
      : layoutMode === 'medium'
      ? '36px 36px 1fr 1fr 55px 90px'
      : '36px 1fr 50px 70px'

  // Close context menu on outside click or Escape
  useEffect(() => {
    if (!contextMenu) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null)
    }

    const handleClickOutside = () => {
      setContextMenu(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('click', handleClickOutside)
    window.addEventListener('contextmenu', handleClickOutside)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('click', handleClickOutside)
      window.removeEventListener('contextmenu', handleClickOutside)
    }
  }, [contextMenu])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  // Sorted tracks
  const sortedTracks = useMemo(() => {
    if (!sortKey) return tracks

    const sorted = [...tracks]
    sorted.sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''

      if (sortKey === 'index') {
        aVal = a.trackNumber ?? 0
        bVal = b.trackNumber ?? 0
      } else if (sortKey === 'title') {
        aVal = (a.title || '').toLowerCase()
        bVal = (b.title || '').toLowerCase()
      } else if (sortKey === 'album') {
        aVal = (a.album || '').toLowerCase()
        bVal = (b.album || '').toLowerCase()
      } else if (sortKey === 'format') {
        aVal = (a.format || '').toLowerCase()
        bVal = (b.format || '').toLowerCase()
      } else if (sortKey === 'duration') {
        aVal = a.duration || 0
        bVal = b.duration || 0
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [tracks, sortKey, sortOrder])

  const { startIndex, endIndex, paddingTop, paddingBottom } = calculateVirtualWindow(
    scrollTop,
    viewportHeight,
    sortedTracks.length,
    ROW_HEIGHT,
    OVERSCAN
  )

  const visibleTracks = sortedTracks.slice(startIndex, endIndex)

  const renderHeaderCol = (
    key: SortKey,
    label: string,
    align: 'left' | 'center' | 'right' = 'left'
  ) => {
    const isActive = sortKey === key
    return (
      <div
        onClick={() => handleSort(key)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
          gap: 4,
          cursor: 'pointer',
          userSelect: 'none',
          color: isActive ? 'var(--color-accent)' : 'var(--text-dim)',
          transition: 'color 0.15s'
        }}
        title={`Sort by ${label} (${isActive && sortOrder === 'asc' ? 'descending' : 'ascending'})`}
      >
        <span>{label}</span>
        {isActive &&
          (sortOrder === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </div>
    )
  }

  const contextItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '7px 10px',
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: 'var(--text)',
    fontSize: 12,
    fontWeight: 500,
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s'
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ flex: 1, overflowY: 'auto', padding: '0 0 12px 0', position: 'relative' }}
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
          gap: layoutMode === 'compact' ? 8 : 16,
          padding: layoutMode === 'compact' ? '12px 12px 8px 12px' : '12px 24px 8px 24px',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          borderBottom: '1px solid var(--border)',
          marginBottom: 4
        }}
      >
        {layoutMode !== 'compact' && renderHeaderCol('index', '#', 'center')}
        <span></span> {/* Avatar space */}
        {renderHeaderCol('title', 'Title', 'left')}
        {layoutMode === 'wide' && renderHeaderCol('album', 'Album', 'left')}
        {layoutMode !== 'compact' && renderHeaderCol('format', 'Format', 'left')}
        {renderHeaderCol('duration', 'Time', 'right')}
        <span style={{ textAlign: 'right' }}></span>
      </div>

      {/* Top virtual spacer */}
      {paddingTop > 0 && <div style={{ height: paddingTop }} />}

      {/* Render only visible slice with overscan */}
      {visibleTracks.map((track, sliceIndex) => {
        const i = startIndex + sliceIndex
        const isPlaying = player.currentTrackId === track.id && player.status === 'playing'
        const isActive = player.currentTrackId === track.id
        const isSelected = selectedTrackId === track.id

        return (
          <div
            key={`${track.id}-${i}`}
            onClick={() => setSelectedTrackId(track.id)}
            onDoubleClick={() => setQueue(sortedTracks, i)}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                track,
                index: i
              })
            }}
            style={{
              display: 'grid',
              gridTemplateColumns: gridTemplate,
              gap: layoutMode === 'compact' ? 8 : 16,
              padding: layoutMode === 'compact' ? '8px 12px' : '8px 24px',
              height: 52,
              boxSizing: 'border-box',
              alignItems: 'center',
              cursor: 'pointer',
              borderRadius: 8,
              margin: layoutMode === 'compact' ? '2px 4px' : '2px 12px',
              background: isActive
                ? 'rgba(var(--color-accent-rgb), 0.12)'
                : isSelected
                ? 'rgba(var(--color-accent-rgb), 0.06)'
                : 'transparent',
              outline:
                isSelected && !isActive
                  ? '1px solid rgba(var(--color-accent-rgb), 0.3)'
                  : 'none',
              transition: 'background 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={(e) => {
              if (!isActive && !isSelected)
                (e.currentTarget as HTMLDivElement).style.background =
                  'rgba(var(--color-accent-rgb), 0.03)'
            }}
            onMouseLeave={(e) => {
              if (!isActive && !isSelected)
                (e.currentTarget as HTMLDivElement).style.background = 'transparent'
            }}
          >
            {/* Index / Playing indicator (omitted in compact) */}
            {layoutMode !== 'compact' && (
              <div
                style={{
                  fontSize: 12,
                  color: isActive ? 'var(--color-accent)' : 'var(--text-dim)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontVariantNumeric: 'tabular-nums',
                  textAlign: 'center',
                  fontWeight: isActive ? 700 : 500
                }}
              >
                {isPlaying ? (
                  <span style={{ color: 'var(--color-accent)' }}>▶</span>
                ) : (
                  track.trackNumber || i + 1
                )}
              </div>
            )}

            {/* Track Avatar / Icon */}
            <div
              style={{
                width: layoutMode === 'compact' ? 32 : 36,
                height: layoutMode === 'compact' ? 32 : 36,
                borderRadius: 6,
                background: isActive ? 'var(--color-accent)' : 'var(--bg-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: isActive ? '0 4px 12px rgba(var(--color-accent-rgb), 0.3)' : 'none',
                transition: 'all 0.2s',
                overflow: 'hidden'
              }}
            >
              {track.artwork ? (
                <img
                  src={track.artwork}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Music2 size={layoutMode === 'compact' ? 14 : 16} color={isActive ? '#fff' : 'var(--text-dim)'} />
              )}
            </div>

            {/* Title + Artist */}
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: isActive ? 'var(--color-accent)' : 'var(--text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {track.title}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {track.artist}
              </div>
            </div>

            {/* Album (wide only) */}
            {layoutMode === 'wide' && (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {track.album}
              </div>
            )}

            {/* Format badge (omitted in compact) */}
            {layoutMode !== 'compact' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'rgba(var(--color-accent-rgb), 0.12)',
                    color: 'var(--color-accent)',
                    textTransform: 'uppercase',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}
                >
                  {track.format}
                </span>
                {track.bitDepth && (
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--text-dim)',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}
                  >
                    {track.bitDepth}bit
                  </span>
                )}
              </div>
            )}

            {/* Duration */}
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                textAlign: 'right',
                fontFamily: 'JetBrains Mono, monospace',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {formatDuration(track.duration || 0)}
            </div>

            {/* Actions */}
            <div
              style={{
                textAlign: 'right',
                display: 'flex',
                gap: 4,
                justifyContent: 'flex-end',
                alignItems: 'center'
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  playNextTrack(track)
                }}
                title="Play Next"
                style={{
                  background: 'transparent',
                  color: 'var(--text-dim)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-dim)'
                }}
              >
                <ListPlus size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  addToQueue(track)
                }}
                title="Add to Queue"
                style={{
                  background: 'transparent',
                  color: 'var(--text-dim)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-dim)'
                }}
              >
                <ListEnd size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setTrackToPlaylist(track)
                }}
                title="Add to Playlist"
                style={{
                  background: 'transparent',
                  color: 'var(--text-dim)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-dim)'
                }}
              >
                <PlusCircle size={16} />
              </button>
              {isQueueView && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFromQueue(i)
                  }}
                  title="Remove from Queue"
                  style={{
                    background: 'transparent',
                    color: 'var(--text-dim)',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ef4444'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-dim)'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        )
      })}

      {/* Bottom virtual spacer */}
      {paddingBottom > 0 && <div style={{ height: paddingBottom }} />}

      {/* Floating Context Menu */}
      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: Math.max(8, Math.min(contextMenu.x, window.innerWidth - 180)),
            top: Math.max(8, Math.min(contextMenu.y, window.innerHeight - 220)),
            zIndex: 1000,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            padding: 4,
            minWidth: 160,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}
        >
          <button
            onClick={() => {
              setQueue(sortedTracks, contextMenu.index)
              setContextMenu(null)
            }}
            style={contextItemStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(var(--color-accent-rgb), 0.12)'
              e.currentTarget.style.color = 'var(--color-accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text)'
            }}
          >
            <Play size={14} />
            <span>Play</span>
          </button>
          <button
            onClick={() => {
              playNextTrack(contextMenu.track)
              setContextMenu(null)
            }}
            style={contextItemStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(var(--color-accent-rgb), 0.12)'
              e.currentTarget.style.color = 'var(--color-accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text)'
            }}
          >
            <ListPlus size={14} />
            <span>Play Next</span>
          </button>
          <button
            onClick={() => {
              addToQueue(contextMenu.track)
              setContextMenu(null)
            }}
            style={contextItemStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(var(--color-accent-rgb), 0.12)'
              e.currentTarget.style.color = 'var(--color-accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text)'
            }}
          >
            <ListEnd size={14} />
            <span>Add to Queue</span>
          </button>
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 6px' }} />
          <button
            onClick={() => {
              setTrackToPlaylist(contextMenu.track)
              setContextMenu(null)
            }}
            style={contextItemStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(var(--color-accent-rgb), 0.12)'
              e.currentTarget.style.color = 'var(--color-accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text)'
            }}
          >
            <PlusCircle size={14} />
            <span>Add to Playlist</span>
          </button>
          {isQueueView && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 6px' }} />
              <button
                onClick={() => {
                  removeFromQueue(contextMenu.index)
                  setContextMenu(null)
                }}
                style={{ ...contextItemStyle, color: '#ef4444' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <Trash2 size={14} />
                <span>Remove from Queue</span>
              </button>
            </>
          )}
        </div>
      )}

      <AddToPlaylistModal track={trackToPlaylist} onClose={() => setTrackToPlaylist(null)} />
    </div>
  )
}
