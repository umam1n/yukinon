import React, { useState, useEffect } from 'react'
import { X, Save, Music2, FileAudio, Disc } from 'lucide-react'
import type { Track, TagUpdatePayload } from '../../../../../shared/types'
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
  const { setTracks } = useApp()

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
        title: title.trim(),
        artist: artist.trim(),
        album: album.trim(),
        albumArtist: albumArtist.trim() || undefined,
        year: year ? parseInt(year, 10) : undefined,
        genre: genre.trim() || undefined,
        trackNumber: trackNumber ? parseInt(trackNumber, 10) : undefined
      }

      const updatedTrack = await window.yukinon.library.updateTags(track.id, payload)
      if (updatedTrack) {
        setTracks((prev) => prev.map((t) => (t.id === track.id ? updatedTrack : t)))
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
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileAudio size={18} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Edit Audio Metadata</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSave}
          style={{
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          {error && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
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
              placeholder="Track title"
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
                placeholder="Artist name"
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
                placeholder="Album artist"
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
              placeholder="Album title"
              style={inputStyle}
            />
          </div>

          {/* Year, Genre, Track Number */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
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
              <label style={labelStyle}>Track #</label>
              <input
                type="number"
                value={trackNumber}
                onChange={(e) => setTrackNumber(e.target.value)}
                placeholder="e.g. 1"
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
          </div>

          {/* Audio File Specifications (Read-Only) */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: 'var(--bg-3)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginTop: 4
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              File Specifications
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8,
                fontSize: 12
              }}
            >
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>FORMAT</span>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                  {track.format?.toUpperCase() || '-'}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>BITRATE</span>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                  {track.bitrate ? `${track.bitrate} kbps` : '-'}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>SAMPLE RATE</span>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                  {track.sampleRate ? `${track.sampleRate / 1000} kHz` : '-'}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>BIT DEPTH</span>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                  {track.bitDepth ? `${track.bitDepth}-bit` : '-'}
                </div>
              </div>
            </div>
            {track.path && (
              <div style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                <span style={{ fontWeight: 600 }}>Path: </span>
                <span title={track.path}>{track.path}</span>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 500,
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
                borderRadius: 6,
                border: 'none',
                background: 'var(--color-accent)',
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
              <Save size={14} />
              {isSaving ? 'Saving...' : 'Save Metadata'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
