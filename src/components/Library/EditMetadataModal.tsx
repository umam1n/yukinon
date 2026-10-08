import React, { useState, useEffect } from 'react'
import { X, Save, Music2, FileAudio, Disc } from 'lucide-react'
import type { Track, TagUpdatePayload } from '../../shared/types'
import { useApp } from '../../store/AppContext'

interface EditMetadataModalProps {
  track: Track | null
  onClose: () => void
  onSaved?: (updatedTrack: Track) => void
}

export default function EditMetadataModal({
  track,
  onClose,
  onSaved
}: EditMetadataModalProps): React.ReactElement | null {
  const { tracks, setTracks } = useApp()

  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [album, setAlbum] = useState('')
  const [albumArtist, setAlbumArtist] = useState('')
  const [year, setYear] = useState<string>('')
  const [genre, setGenre] = useState('')
  const [trackNumber, setTrackNumber] = useState<string>('')

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (track) {
      setTitle(track.title || '')
      setArtist(track.artist || '')
      setAlbum(track.album || '')
      setAlbumArtist(track.albumArtist || '')
      setYear(track.year ? String(track.year) : '')
      setGenre(track.genre || '')
      setTrackNumber((track as any).trackNumber ? String((track as any).trackNumber) : '')
      setError(null)
    }
  }, [track])

  if (!track) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const payload: TagUpdatePayload = {
        trackId: track.id,
        filePath: track.path || '',
        tags: {
          title: title.trim(),
          artist: artist.trim(),
          album: album.trim(),
          albumArtist: albumArtist.trim() || undefined,
          year: year ? parseInt(year, 10) : undefined,
          genre: genre.trim() || undefined,
          trackNumber: trackNumber ? parseInt(trackNumber, 10) : undefined
        }
      }

      const updatedTrack = await window.yukinon.library.updateTags(track.id, payload)
      if (updatedTrack) {
        setTracks(tracks.map((t) => (t.id === track.id ? updatedTrack : t)))
        if (onSaved) onSaved(updatedTrack)
      }
      onClose()
    } catch (err: any) {
      console.error('[EditMetadataModal] Failed to update tags:', err)
      setError(err?.message || 'Failed to save metadata')
    } finally {
      setIsSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    background: 'var(--bg-3)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box'
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4,
    display: 'block'
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 540,
          maxHeight: '90vh',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Disc size={20} style={{ color: 'var(--color-accent)' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                Edit Track Metadata
              </h2>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {track.format?.toUpperCase() || 'AUDIO'} &bull; {track.title}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          <div
            style={{
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}
          >
            {error && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: 12
                }}
              >
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label style={labelStyle}>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Track Title"
                required
                style={inputStyle}
              />
            </div>

            {/* Artist & Album Artist */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Artist</label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Artist"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Album Artist</label>
                <input
                  type="text"
                  value={albumArtist}
                  onChange={(e) => setAlbumArtist(e.target.value)}
                  placeholder="Album Artist"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Album */}
            <div>
              <label style={labelStyle}>Album</label>
              <input
                type="text"
                value={album}
                onChange={(e) => setAlbum(e.target.value)}
                placeholder="Album Name"
                style={inputStyle}
              />
            </div>

            {/* Year, Genre, Track Number */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="YYYY"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Genre</label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="Genre"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Track #</label>
                <input
                  type="number"
                  value={trackNumber}
                  onChange={(e) => setTrackNumber(e.target.value)}
                  placeholder="#"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Audio Specifications (Read-only) */}
            <div
              style={{
                marginTop: 8,
                padding: '12px',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-dim)' }}>
                <FileAudio size={14} /> AUDIO SPECIFICATIONS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 11 }}>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Format: </span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{track.format?.toUpperCase() || 'UNKNOWN'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Bit Depth: </span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{track.bitDepth ? `${track.bitDepth}-bit` : '16-bit'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Sample Rate: </span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{track.sampleRate ? `${track.sampleRate / 1000} kHz` : '44.1 kHz'}</span>
                </div>
              </div>
              {track.path && (
                <div style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                  File: {track.path}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
              background: 'var(--bg)'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                background: 'var(--color-accent)',
                border: 'none',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: isSaving ? 0.7 : 1
              }}
            >
              <Save size={15} />
              {isSaving ? 'Saving...' : 'Save Metadata'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
