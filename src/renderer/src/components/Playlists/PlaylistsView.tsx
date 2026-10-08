import React, { useState, useEffect } from 'react'
import { useApp } from '../../store/AppContext'
import { ListMusic, Plus, Trash2, Play, Shuffle, Disc, X, Sparkles, ArrowLeft } from 'lucide-react'
import type { Track } from '../../../../shared/types'
import CreateSmartPlaylistModal from './CreateSmartPlaylistModal'
import TrackList from '../Library/TrackList'

export default function PlaylistsView(): React.ReactElement {
  const { play, setQueue } = useApp()
  const [playlists, setPlaylists] = useState<any[]>([])
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null)
  const [tracks, setTracks] = useState<any[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [isSmartModalOpen, setIsSmartModalOpen] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  )

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
      {/* Create Smart Playlist Modal */}
      <CreateSmartPlaylistModal
        isOpen={isSmartModalOpen}
        onClose={() => setIsSmartModalOpen(false)}
        onCreated={async (newId) => {
          await loadPlaylists()
          setActivePlaylistId(newId)
        }}
      />

      {/* Sidebar */}
      <div
        style={{
          width: windowWidth < 720 ? '100%' : 280,
          borderRight: windowWidth < 720 ? 'none' : '1px solid rgba(255,255,255,0.05)',
          display: windowWidth < 720 && activePlaylistId ? 'none' : 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}
      >
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ListMusic size={20} className="text-accent" />
            Playlists
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setIsSmartModalOpen(true)}
              title="Create Smart Playlist (AI / Rules)"
              style={{
                background: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                color: '#c084fc',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Sparkles size={13} />
              <span>Smart</span>
            </button>
            <button
              onClick={() => setIsCreating(true)}
              title="Create Standard Playlist"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 4 }}
            >
              <Plus size={20} />
            </button>
          </div>
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
              <div style={{ overflow: 'hidden', paddingRight: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: activePlaylistId === p.id ? 'var(--text)' : 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {p.type === 'smart' && <Sparkles size={13} style={{ color: '#c084fc', flexShrink: 0 }} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.trackCount} tracks {p.type === 'smart' && '• Smart'}</div>
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
              No playlists found. Click + or Smart to create one.
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: windowWidth < 720 && !activePlaylistId ? 'none' : 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        {activePlaylist ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ padding: windowWidth < 600 ? '16px 16px 12px 16px' : '24px 32px 16px 32px', flexShrink: 0 }}>
              {windowWidth < 720 && (
                <button
                  onClick={() => setActivePlaylistId(null)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-accent)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 12,
                    padding: 0
                  }}
                >
                  <ArrowLeft size={16} /> Back to Playlists
                </button>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: windowWidth < 600 ? 16 : 24, marginBottom: 16 }}>
                <div
                  style={{
                    width: 'clamp(80px, 15vw, 160px)',
                    height: 'clamp(80px, 15vw, 160px)',
                    borderRadius: 12,
                    background: 'rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    flexShrink: 0,
                    overflow: 'hidden'
                  }}
                >
                  {tracks.length > 0 && tracks[0].artwork ? (
                    <img src={tracks[0].artwork} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                  ) : (
                    <ListMusic size={40} color="var(--text-muted)" />
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {activePlaylist.type === 'smart' ? (
                      <>
                        <Sparkles size={14} style={{ color: '#c084fc' }} />
                        <span style={{ color: '#c084fc' }}>Smart Dynamic Playlist</span>
                      </>
                    ) : (
                      'Playlist'
                    )}
                  </div>
                  <h1 style={{ fontSize: 'clamp(24px, 4vw, 48px)', fontWeight: 800, margin: '0 0 12px 0', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activePlaylist.name}
                  </h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
            </div>

            {/* Virtualized Responsive TrackList */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {tracks.length > 0 ? (
                <TrackList tracks={tracks} />
              ) : (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
                  This playlist is empty. Add songs from your library or Jellyfin/Subsonic.
                </div>
              )}
            </div>
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
