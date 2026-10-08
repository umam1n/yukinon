import React from 'react'
import { Play, Pause, SkipBack, SkipForward, Maximize2, Music2, Volume2, VolumeX } from 'lucide-react'
import { useApp } from '../../store/AppContext'

function formatTime(secs: number): string {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function MiniPlayerHUD(): React.ReactElement {
  const { player, tracks, queue, togglePlayPause, playNext, playPrev, seekTo, toggleMiniPlayer, setVolume } = useApp()

  const currentTrack =
    tracks.find((t) => t.id === player.currentTrackId) ||
    queue.find((t) => t.id === player.currentTrackId)

  const artwork = currentTrack?.artwork || player.artwork
  const title =
    currentTrack?.title ||
    player.ytmInfo?.title ||
    player.radioInfo?.title ||
    player.subsonicInfo?.title ||
    player.jellyfinInfo?.title ||
    'No Track Playing'
  const artist =
    currentTrack?.artist ||
    player.ytmInfo?.artist ||
    player.radioInfo?.station ||
    player.subsonicInfo?.artist ||
    player.jellyfinInfo?.artist ||
    'Yukinon'

  const progressPercent = player.duration > 0 ? Math.min(100, (player.position / player.duration) * 100) : 0

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!player.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seekTo(ratio * player.duration)
  }

  const toggleMute = () => {
    if (player.volume > 0) {
      setVolume(0)
    } else {
      setVolume(0.8)
    }
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
    >
      {/* Draggable Header Bar */}
      <div
        style={{
          height: 26,
          // @ts-ignore
          WebkitAppRegion: 'drag',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          background: 'rgba(0, 0, 0, 0.35)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-dim)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase'
          }}
        >
          Yukinon Mini
        </span>
        <button
          onClick={toggleMiniPlayer}
          title="Return to Full Player"
          style={{
            // @ts-ignore
            WebkitAppRegion: 'no-drag',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            transition: 'color 0.15s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <Maximize2 size={13} />
        </button>
      </div>

      {/* Main Track & Controls Row */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 10px',
          minHeight: 0
        }}
      >
        {/* Artwork */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            overflow: 'hidden',
            background: 'var(--bg-3)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          {artwork ? (
            <img src={artwork} alt="Artwork" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Music2 size={20} color="var(--text-dim)" />
          )}
        </div>

        {/* Title & Artist */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            title={title}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            title={artist}
          >
            {artist}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button
            onClick={toggleMute}
            title={player.volume === 0 ? 'Unmute' : 'Mute'}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4
            }}
          >
            {player.volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button
            onClick={playPrev}
            title="Previous Track"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4
            }}
          >
            <SkipBack size={15} />
          </button>
          <button
            onClick={togglePlayPause}
            title={player.status === 'playing' ? 'Pause' : 'Play'}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              background: 'var(--color-accent)',
              border: 'none',
              color: '#000',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {player.status === 'playing' ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" style={{ marginLeft: 1 }} />}
          </button>
          <button
            onClick={playNext}
            title="Next Track"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4
            }}
          >
            <SkipForward size={15} />
          </button>
        </div>
      </div>

      {/* Scrubber & Time Indication */}
      <div style={{ padding: '0 10px 8px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div
          onClick={handleSeekClick}
          style={{
            height: 5,
            background: 'var(--bg-3)',
            borderRadius: 3,
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: 'var(--color-accent)',
              borderRadius: 3,
              transition: 'width 0.1s linear'
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: 'var(--text-dim)',
            fontFamily: 'JetBrains Mono, monospace'
          }}
        >
          <span>{formatTime(player.position)}</span>
          <span>{formatTime(player.duration)}</span>
        </div>
      </div>
    </div>
  )
}
