import React, { useState, useEffect } from 'react'
import { useApp } from '../../store/AppContext'
import { ListMusic, Plus, Trash2, Play, Shuffle, Disc, X } from 'lucide-react'
import type { Track } from '@shared/types'

export default function PlaylistsView(): React.ReactElement {
  const { play, setQueue, confirm } = useApp()
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
    const confirmed = await confirm({
      title: 'Delete Playlist',
      message: 'Are you sure you want to delete this playlist?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true
    })
    if (confirmed) {
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
    <div className="flex h-full bg-[var(--bg)]">
      {/* Sidebar: Master list */}
      <div 
        className={`w-full md:w-[280px] border-r border-white/5 flex flex-col flex-shrink-0 ${
          activePlaylistId ? 'hidden md:flex' : 'flex'
        }`}
      >
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

      {/* Main Content: Detail View */}
      <div 
        className={`flex-1 overflow-y-auto ${
          activePlaylistId ? 'flex flex-col' : 'hidden md:flex flex-col'
        }`}
      >
        {activePlaylist ? (
          <div className="p-6 md:p-8 flex flex-col flex-1">
            {/* Back button on mobile */}
            <button 
              onClick={() => setActivePlaylistId(null)}
              className="md:hidden mb-4 text-xs font-semibold px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white self-start flex items-center gap-2"
            >
              ← Back to Playlists
            </button>

            <div className="flex md:flex-row flex-col md:items-end gap-6 mb-8">
              <div style={{ width: 120, height: 120, borderRadius: 12, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }} className="flex-shrink-0 mx-auto md:mx-0">
                {tracks.length > 0 && tracks[0].artwork ? (
                  <img src={tracks[0].artwork} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                ) : (
                  <ListMusic size={48} color="var(--text-muted)" />
                )}
              </div>
              <div className="text-center md:text-left">
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Playlist</div>
                <h1 className="text-2xl md:text-4xl font-extrabold mb-4 leading-tight">{activePlaylist.name}</h1>
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <button
                    onClick={() => handlePlayAll(false)}
                    disabled={tracks.length === 0}
                    style={{
                      background: 'var(--color-accent)',
                      color: 'black',
                      border: 'none',
                      borderRadius: 24,
                      padding: '10px 20px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: tracks.length ? 'pointer' : 'not-allowed',
                      opacity: tracks.length ? 1 : 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Play size={16} fill="currentColor" /> Play
                  </button>
                  <button
                    onClick={() => handlePlayAll(true)}
                    disabled={tracks.length === 0}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      color: 'var(--text)',
                      border: 'none',
                      borderRadius: 24,
                      padding: '10px 20px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: tracks.length ? 'pointer' : 'not-allowed',
                      opacity: tracks.length ? 1 : 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Shuffle size={16} /> Shuffle
                  </button>
                </div>
              </div>
            </div>

            {tracks.length > 0 ? (
              <div className="flex flex-col gap-1 flex-1">
                {tracks.map((track, idx) => (
                  <div
                    key={track.playlistTrackId}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 1fr auto',
                      gap: 12,
                      padding: '10px 12px',
                      alignItems: 'center',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.02)',
                      marginBottom: 4
                    }}
                  >
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', fontFamily: 'monospace' }}>{idx + 1}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist} · <span style={{ textTransform: 'capitalize' }}>{track.source}</span></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => handlePlayTrack(idx)}
                        style={{ background: 'var(--color-accent)', color: 'black', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
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
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)', fontSize: 13 }}>
                This playlist is empty. Add songs from your library or integrations.
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
