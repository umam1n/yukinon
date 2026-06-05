import React from 'react'
import { useApp } from '../../store/AppContext'
import { Music2 } from 'lucide-react'
import type { Track } from '../../../../../../shared/types'

function formatDuration(secs: number): string {
  if (!secs) return ''
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function TrackList({ tracks }: { tracks: Track[] }): React.ReactElement {
  const { setQueue, player } = useApp()

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
      {/* Header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 40px 1fr 1fr 120px 60px',
          gap: 16,
          padding: '8px 24px',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          borderBottom: '1px solid var(--border)',
          marginBottom: 8
        }}
      >
        <span style={{ textAlign: 'center' }}>#</span>
        <span></span> {/* Avatar space */}
        <span>Title</span>
        <span>Album</span>
        <span>Format</span>
        <span style={{ textAlign: 'right' }}>Time</span>
      </div>

      {tracks.map((track, i) => {
        const isPlaying = player.currentTrackId === track.id && player.status === 'playing'
        const isActive = player.currentTrackId === track.id

        return (
          <div
            key={track.id}
            onDoubleClick={() => setQueue(tracks, i)}
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 40px 1fr 1fr 120px 60px',
              gap: 16,
              padding: '8px 24px',
              alignItems: 'center',
              cursor: 'pointer',
              borderRadius: 8,
              margin: '2px 12px',
              background: isActive ? 'rgba(var(--color-accent-rgb), 0.08)' : 'transparent',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'scale(1)',
            }}
            onMouseEnter={(e) => {
              if (!isActive)
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(var(--color-accent-rgb), 0.03)'
            }}
            onMouseLeave={(e) => {
              if (!isActive)
                (e.currentTarget as HTMLDivElement).style.background = 'transparent'
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(0.99)'
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'
            }}
          >
            {/* Index / Playing indicator */}
            <div
              style={{
                fontSize: 12,
                color: isActive ? 'var(--color-accent)' : 'var(--text-dim)',
                fontFamily: 'JetBrains Mono, monospace',
                textAlign: 'center',
                fontWeight: isActive ? 700 : 500
              }}
            >
              {isPlaying ? (
                <span style={{ color: 'var(--color-accent)' }}>▶</span>
              ) : (
                i + 1
              )}
            </div>

            {/* Track Avatar / Icon */}
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 6,
              background: isActive ? 'var(--color-accent)' : 'var(--bg-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: isActive ? '0 4px 12px rgba(var(--color-accent-rgb), 0.3)' : 'none',
              transition: 'all 0.2s'
            }}>
              <Music2 size={16} color={isActive ? '#fff' : 'var(--text-dim)'} />
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

            {/* Album */}
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

            {/* Format badge */}
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

            {/* Duration */}
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                textAlign: 'right',
                fontFamily: 'JetBrains Mono, monospace'
              }}
            >
              {formatDuration(track.duration)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
