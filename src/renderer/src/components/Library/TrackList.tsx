import React from 'react'
import { useApp } from '../../store/AppContext'
import { Music2, PlusCircle } from 'lucide-react'
import type { Track } from '../../../../../../shared/types'
import AddToPlaylistModal from '../Playlists/AddToPlaylistModal'

function formatDuration(secs: number): string {
  if (!secs) return ''
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function TrackList({ tracks, isQueueView }: { tracks: Track[], isQueueView?: boolean }): React.ReactElement {
  const { setQueue, player, removeFromQueue } = useApp()
  const [trackToPlaylist, setTrackToPlaylist] = React.useState<Track | null>(null)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
      {/* Header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 40px 1fr 1fr 120px 60px 60px',
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
        <span style={{ textAlign: 'right' }}></span>
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
              gridTemplateColumns: '40px 40px 1fr 1fr 120px 60px 60px',
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

            {/* Actions */}
            <div style={{ textAlign: 'right', display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setTrackToPlaylist(track) }}
                title="Add to Playlist"
                style={{
                  background: 'transparent',
                  color: 'var(--text-dim)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)' }}
              >
                <PlusCircle size={16} />
              </button>
              {isQueueView && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeFromQueue(i) }}
                  title="Remove from Queue"
                  style={{
                    background: 'transparent',
                    color: 'var(--text-dim)',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              )}
            </div>
          </div>
        )
      })}
      
      <AddToPlaylistModal track={trackToPlaylist} onClose={() => setTrackToPlaylist(null)} />
    </div>
  )
}
