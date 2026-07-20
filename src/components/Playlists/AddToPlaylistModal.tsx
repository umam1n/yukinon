import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
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
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5,5,10,0.7)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }} onClick={onClose}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(20,20,35,0.9), rgba(10,10,20,0.95))',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        width: 360,
        maxWidth: '90%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>Add to Playlist</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        
        <div style={{ padding: 20, maxHeight: 400, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.03)' }}>
            {track.artwork ? (
              <img src={track.artwork} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>🎵</div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
            </div>
          </div>
          
          <h4 style={{ margin: '0 0 10px 0', fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Your Playlists</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {playlists.map(p => (
              <button
                key={p.id}
                onClick={() => handleAdd(p.id, p.name)}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.03)',
                  padding: '12px 16px',
                  borderRadius: 12,
                  color: 'var(--text)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background 0.2s, border-color 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)'
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.trackCount} tracks</span>
              </button>
            ))}
            {playlists.length === 0 && (
              <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '20px 0', fontSize: 13 }}>
                No playlists available.<br/>Create one in the Playlists tab.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
