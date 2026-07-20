import React from 'react'
import { useApp } from '../../store/AppContext'
import { Music2, PlusCircle } from 'lucide-react'
import type { Track } from '@shared/types'
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
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
      {/* Header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr auto',
          gap: 12,
          padding: '8px 16px',
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
        <span></span>
      </div>

      {tracks.map((track, i) => {
        const isPlaying = player.currentTrackId === track.id && player.status === 'playing'
        const isActive = player.currentTrackId === track.id

        return (
          <div
            key={track.id}
            onClick={() => setQueue(tracks, i)}
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr auto',
              gap: 12,
              padding: '10px 16px',
              alignItems: 'center',
              cursor: 'pointer',
              borderRadius: 10,
              margin: '1px 8px',
              background: isActive ? 'rgba(var(--color-accent-rgb), 0.1)' : 'transparent',
              minHeight: 56,
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

            {/* Right: duration + playlist button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
                {formatDuration(track.duration || 0)}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setTrackToPlaylist(track) }}
                style={{ background: 'transparent', color: 'var(--text-dim)', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex' }}
              >
                <PlusCircle size={16} />
              </button>
              {isQueueView && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeFromQueue(i) }}
                  style={{ background: 'transparent', color: 'var(--text-dim)', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex' }}
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
