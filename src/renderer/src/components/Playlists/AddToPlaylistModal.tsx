import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import type { Track } from '../../../../shared/types'

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
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        width: 400,
        maxWidth: '90%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Add to Playlist</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        
        <div style={{ padding: 20, maxHeight: 400, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            {track.artwork && <img src={track.artwork} style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }} />}
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{track.title}</div>
              <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>{track.artist}</div>
            </div>
          </div>
          
          <h4 style={{ margin: '0 0 12px 0', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Your Playlists</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {playlists.map(p => (
              <button
                key={p.id}
                onClick={() => handleAdd(p.id, p.name)}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: 8,
                  color: 'var(--text)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              >
                <span>{p.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{p.trackCount} tracks</span>
              </button>
            ))}
            {playlists.length === 0 && (
              <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 20, fontSize: 14 }}>
                No playlists available. Create one in the Playlists tab.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
