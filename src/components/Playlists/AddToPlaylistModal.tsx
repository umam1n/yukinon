import React, { useState, useEffect } from 'react'
import { X, Music2 } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import type { Track } from '@shared/types'

interface AddToPlaylistModalProps {
  track: Track | null
  onClose: () => void
}

export default function AddToPlaylistModal({ track, onClose }: AddToPlaylistModalProps): React.ReactElement | null {
  const { notify } = useApp()
  const [playlists, setPlaylists] = useState<any[]>([])

  useEffect(() => {
    if (track) {
      window.yukinon.playlists.getAll().then(setPlaylists)
    }
  }, [track])

  if (!track) return null

  const handleAdd = async (playlistId: string, playlistName: string) => {
    await window.yukinon.playlists.addTrack(playlistId, track)
    notify(`Added to playlist ${playlistName}`)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(5, 5, 10, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '100%',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          background: 'var(--bg-card)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.4)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bottom Sheet Handle */}
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: 'var(--border)',
            margin: '10px auto 6px'
          }}
        />

        {/* Sheet Header */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            Add to Playlist
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Sheet Content */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {/* Track Summary Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 20,
              background: 'var(--bg-3)',
              padding: 10,
              borderRadius: 8,
              border: '1px solid var(--border)'
            }}
          >
            {track.artwork ? (
              <img
                src={track.artwork}
                alt=""
                style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 6,
                  background: 'var(--bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-dim)'
                }}
              >
                <Music2 size={20} />
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  color: 'var(--text)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {track.title}
              </div>
              <div
                style={{
                  color: 'var(--text-muted)',
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {track.artist}
              </div>
            </div>
          </div>

          <h4
            style={{
              margin: '0 0 10px 0',
              fontSize: 11,
              color: 'var(--text-dim)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1
            }}
          >
            Your Playlists
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {playlists.map((p) => (
              <button
                key={p.id}
                onClick={() => handleAdd(p.id, p.name)}
                style={{
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border)',
                  padding: '12px 16px',
                  borderRadius: 8,
                  color: 'var(--text)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background 0.15s, border-color 0.15s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(var(--color-accent-rgb), 0.1)'
                  e.currentTarget.style.borderColor = 'rgba(var(--color-accent-rgb), 0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-3)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {p.trackCount} track{p.trackCount === 1 ? '' : 's'}
                </span>
              </button>
            ))}
            {playlists.length === 0 && (
              <div
                style={{
                  color: 'var(--text-dim)',
                  textAlign: 'center',
                  padding: '24px 0',
                  fontSize: 13
                }}
              >
                No playlists available.
                <br />
                Create one in the Playlists tab.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
