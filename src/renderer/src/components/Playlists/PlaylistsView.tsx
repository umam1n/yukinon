import React, { useState, useEffect } from 'react'
import { useApp } from '../../store/AppContext'
import { ListMusic, Plus, Trash2, Play, Shuffle, Disc, X } from 'lucide-react'
import type { Track } from '../../../../shared/types'

export default function PlaylistsView(): React.ReactElement {
  const { play, setQueue } = useApp()
  const [playlists, setPlaylists] = useState<any[]>([])
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null)
  const [tracks, setTracks] = useState<any[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')

  const loadPlaylists = async () => {
    const list = await window.yukinon.playlists.getAll()
    setPlaylists(list)
  }

  const loadTracks = async (id: string) => {
    const t = await window.yukinon.playlists.getTracks(id)
    setTracks(t)
  }

  useEffect(() => {
    loadPlaylists()
  }, [])

  useEffect(() => {
    if (activePlaylistId) {
      loadTracks(activePlaylistId)
    } else {
      setTracks([])
    }
  }, [activePlaylistId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlaylistName.trim()) return
    const id = await window.yukinon.playlists.create(newPlaylistName.trim())
    await loadPlaylists()
    setActivePlaylistId(id)
    setIsCreating(false)
    setNewPlaylistName('')
  }

  const handleDeletePlaylist = async (id: string) => {
    if (confirm('Are you sure you want to delete this playlist?')) {
      await window.yukinon.playlists.delete(id)
      if (activePlaylistId === id) setActivePlaylistId(null)
      loadPlaylists()
    }
  }

  const handleRemoveTrack = async (playlistTrackId: string) => {
    await window.yukinon.playlists.removeTrack(playlistTrackId)
    if (activePlaylistId) loadTracks(activePlaylistId)
    loadPlaylists() // update count
  }

  const handlePlayAll = (shuffle = false) => {
    if (tracks.length === 0) return
    let q = [...tracks]
    if (shuffle) q = q.sort(() => Math.random() - 0.5)
    setQueue(q, 0)
  }

  const handlePlayTrack = (index: number) => {
    setQueue(tracks, index)
  }

  const activePlaylist = playlists.find(p => p.id === activePlaylistId)

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <div style={{ width: 280, borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ListMusic size={20} className="text-accent" />
            Playlists
          </h2>
          <button
            onClick={() => setIsCreating(true)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
          >
            <Plus size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {isCreating && (
            <form onSubmit={handleCreate} style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
              <input
                autoFocus
                type="text"
                placeholder="Playlist name..."
                value={newPlaylistName}
                onChange={e => setNewPlaylistName(e.target.value)}
                style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: 6, color: 'var(--text)', outline: 'none' }}
              />
              <button type="submit" style={{ display: 'none' }}></button>
            </form>
          )}

          {playlists.map(p => (
            <div
              key={p.id}
              onClick={() => setActivePlaylistId(p.id)}
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                background: activePlaylistId === p.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 4,
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => { if (activePlaylistId !== p.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { if (activePlaylistId !== p.id) e.currentTarget.style.background = 'transparent' }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: activePlaylistId === p.id ? 'var(--text)' : 'var(--text-dim)' }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.trackCount} tracks</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(p.id) }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {playlists.length === 0 && !isCreating && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>
              No playlists found. Click + to create one.
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activePlaylist ? (
          <div style={{ padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 32 }}>
              <div style={{ width: 160, height: 160, borderRadius: 12, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                {tracks.length > 0 && tracks[0].artwork ? (
                  <img src={tracks[0].artwork} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                ) : (
                  <ListMusic size={64} color="var(--text-muted)" />
                )}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Playlist</div>
                <h1 style={{ fontSize: 48, fontWeight: 800, margin: '0 0 16px 0', letterSpacing: '-0.02em' }}>{activePlaylist.name}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={() => handlePlayAll(false)}
                    disabled={tracks.length === 0}
                    style={{
                      background: 'var(--color-accent)',
                      color: 'black',
                      border: 'none',
                      borderRadius: 24,
                      padding: '12px 24px',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: tracks.length ? 'pointer' : 'not-allowed',
                      opacity: tracks.length ? 1 : 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <Play size={18} fill="currentColor" /> Play
                  </button>
                  <button
                    onClick={() => handlePlayAll(true)}
                    disabled={tracks.length === 0}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      color: 'var(--text)',
                      border: 'none',
                      borderRadius: 24,
                      padding: '12px 24px',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: tracks.length ? 'pointer' : 'not-allowed',
                      opacity: tracks.length ? 1 : 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <Shuffle size={18} /> Shuffle
                  </button>
                </div>
              </div>
            </div>

            {tracks.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-dim)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>#</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>Title</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>Artist</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>Source</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tracks.map((track, idx) => (
                    <tr
                      key={track.playlistTrackId}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        transition: 'background 0.2s',
                        cursor: 'default'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: 14 }}>{idx + 1}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {track.artwork ? (
                            <img src={track.artwork} style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: 4, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Disc size={20} color="var(--text-dim)" /></div>
                          )}
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{track.title}</div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: 14 }}>{track.artist}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: 14, textTransform: 'capitalize' }}>{track.source}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            onClick={() => handlePlayTrack(idx)}
                            style={{ background: 'var(--color-accent)', color: 'black', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Play
                          </button>
                          <button
                            onClick={() => handleRemoveTrack(track.playlistTrackId)}
                            style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', padding: 6 }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
                This playlist is empty. Add songs from your library or Jellyfin/Subsonic.
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
            Select a playlist to view its tracks.
          </div>
        )}
      </div>
    </div>
  )
}
