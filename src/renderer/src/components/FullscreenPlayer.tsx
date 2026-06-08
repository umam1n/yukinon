import React, { useCallback, useState } from 'react'
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Music2, Shuffle, Repeat, Repeat1, Minimize2, ListMusic
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import { fetchLyrics, parseLRC, type LyricLine } from '../lib/lyrics'

function formatTime(secs: number): string {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function FullscreenPlayer(): React.ReactElement {
  const { player, tracks, togglePlayPause, playNext, playPrev, setPlayer, playbackMode, togglePlaybackMode, setActiveView, setVolume } = useApp()
  const [isMuted, setIsMuted] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false)
  const [isPlainLyrics, setIsPlainLyrics] = useState(false)
  
  const currentTrack = tracks.find((t) => t.id === player.currentTrackId)
  const lyricsContainerRef = React.useRef<HTMLDivElement>(null)
  const activeLyricRef = React.useRef<HTMLDivElement>(null)

  const title = player.source === 'ytm' ? player.ytmInfo?.title || 'YouTube Music' : player.source === 'radio' ? player.radioInfo?.title || 'Internet Radio' : player.source === 'subsonic' ? player.subsonicInfo?.title || 'Navidrome' : currentTrack?.title || 'Nothing playing'
  const artist = player.source === 'ytm' ? player.ytmInfo?.artist || '' : player.source === 'radio' ? player.radioInfo?.station || '' : player.source === 'subsonic' ? player.subsonicInfo?.artist || '' : currentTrack?.artist || '—'
  const artwork = player.artwork

  React.useEffect(() => {
    if (!showLyrics) return
    let isMounted = true

    async function loadLyrics() {
      setIsLoadingLyrics(true)
      setLyrics([])
      setIsPlainLyrics(false)
      const raw = await fetchLyrics(player.source, player.currentTrackId, title, artist, player.duration)
      if (isMounted) {
        if (raw) {
          const parsed = parseLRC(raw)
          setLyrics(parsed)
          setIsPlainLyrics(parsed.every(l => l.time === -1))
        }
        setIsLoadingLyrics(false)
      }
    }

    loadLyrics()
    return () => { isMounted = false }
  }, [showLyrics, player.currentTrackId, title, artist, player.duration, player.source])

  // Scroll to active lyric
  React.useEffect(() => {
    if (showLyrics && !isPlainLyrics && activeLyricRef.current && lyricsContainerRef.current) {
      activeLyricRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [player.position, showLyrics, isPlainLyrics])

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const pos = Number(e.target.value)
      setPlayer({ position: pos })
      
      if (player.source === 'local') {
        const audioEl = document.querySelector('audio') as HTMLAudioElement | null
        if (audioEl) audioEl.currentTime = pos
      } else {
        window.yukinon.ytm.seek?.(pos)
      }
    },
    [setPlayer, player.source]
  )

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    setIsMuted(v === 0)
    setVolume(v)
  }, [setVolume])

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    if (newMuted) {
      setVolume(0)
    } else {
      setVolume(0.8) // default fallback when unmuting if volume was 0
    }
  }, [isMuted, setVolume])

  const progressPercent = player.duration > 0 ? (player.position / player.duration) * 100 : 0

  // Calculate active lyric index
  let activeLyricIndex = -1
  if (!isPlainLyrics && lyrics.length > 0) {
    for (let i = 0; i < lyrics.length; i++) {
      if (player.position >= lyrics[i].time) {
        activeLyricIndex = i
      } else {
        break
      }
    }
  }

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      color: 'var(--text)',
      overflow: 'hidden'
    }}>
      {/* Dynamic blurred background */}
      {artwork && (
        <div style={{
          position: 'absolute',
          top: -100, left: -100, right: -100, bottom: -100,
          backgroundImage: `url(${artwork})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(80px) brightness(0.3)',
          opacity: 0.6,
          zIndex: -1,
          transform: 'scale(1.1)'
        }} />
      )}

      {/* Top Bar with Minimize Button */}
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'flex-end', zIndex: 10 }}>
        <button
          onClick={() => {
            if (player.source === 'ytm') setActiveView('ytm')
            else if (player.source === 'radio') setActiveView('radio')
            else if (player.source === 'subsonic') setActiveView('subsonic')
            else setActiveView('library')
          }}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: 'var(--text)',
            cursor: 'pointer',
            padding: '12px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            transition: 'background 0.2s'
          }}
          title="Minimize Player"
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          <Minimize2 size={24} />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '80px', padding: '0 80px' }}>
        {/* Left Side: Massive Artwork */}
        <div style={{
          width: 'min(500px, 45vh)',
          height: 'min(500px, 45vh)',
          borderRadius: 24,
          background: 'rgba(0,0,0,0.2)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          {artwork ? (
            <img src={artwork} alt="artwork" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Music2 size={80} style={{ color: 'var(--text-dim)' }} />
          )}
        </div>

        {/* Right Side: Track Info & Controls OR Lyrics */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, maxWidth: 600, height: 'min(500px, 45vh)', position: 'relative' }}>
          
          {/* Default Controls View */}
          <div style={{ 
            display: 'flex', flexDirection: 'column', height: '100%',
            opacity: showLyrics ? 0 : 1, pointerEvents: showLyrics ? 'none' : 'auto',
            transition: 'opacity 0.3s ease', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 
          }}>
            <div style={{ fontSize: 48, fontWeight: 800, marginBottom: 8, lineHeight: 1.2, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
            {title}
          </div>
          <div style={{ fontSize: 24, color: 'var(--text-muted)', marginBottom: 40, fontWeight: 500 }}>
            {artist}
          </div>

          {/* Scrubber */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            <div style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
              <input
                type="range"
                min={0}
                max={player.duration || 0}
                value={player.position}
                step={0.5}
                onChange={handleSeek}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }}
              />
              <div style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: 'var(--color-accent)',
                borderRadius: 4,
                transition: 'width 0.1s linear',
                boxShadow: '0 0 10px rgba(var(--color-accent-rgb), 0.5)'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
              <span>{formatTime(player.position)}</span>
              <span>{formatTime(player.duration)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, marginBottom: 48 }}>
            <button
              onClick={togglePlaybackMode}
              title={playbackMode}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: playbackMode !== 'normal' ? 'var(--color-accent)' : 'var(--text-dim)', transition: 'color 0.2s' }}
            >
              {playbackMode === 'shuffle' && <Shuffle size={24} />}
              {playbackMode === 'repeat-all' && <Repeat size={24} />}
              {playbackMode === 'repeat-one' && <Repeat1 size={24} />}
              {playbackMode === 'normal' && <Repeat size={24} />}
            </button>

            <button onClick={playPrev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>
              <SkipBack size={36} />
            </button>

            <button
              onClick={togglePlayPause}
              style={{
                width: 80, height: 80, borderRadius: '50%', background: 'var(--text)', color: 'var(--bg)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                boxShadow: '0 10px 20px rgba(0,0,0,0.2)', transition: 'transform 0.1s'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {player.status === 'playing' ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" style={{ marginLeft: 6 }} />}
            </button>

            <button onClick={playNext} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>
              <SkipForward size={36} />
            </button>
            
            <button 
              onClick={() => setShowLyrics(true)}
              title="Lyrics" 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
            >
              <ListMusic size={24} />
            </button>
          </div>

          {/* Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: 200, margin: '0 auto' }}>
            <button onClick={toggleMute} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range"
              min={0} max={1} step={0.01}
              value={isMuted ? 0 : player.volume ?? 0.8}
              onChange={handleVolume}
              style={{ flex: 1, height: 6, accentColor: 'var(--text)', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Lyrics View */}
          <div style={{
            opacity: showLyrics ? 1 : 0, pointerEvents: showLyrics ? 'auto' : 'none',
            transition: 'opacity 0.3s ease', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Lyrics</h2>
              <button 
                onClick={() => setShowLyrics(false)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text)', padding: '6px 12px', borderRadius: 16, cursor: 'pointer', fontSize: 14 }}
              >
                Close
              </button>
            </div>

            <div ref={lyricsContainerRef} style={{ flex: 1, overflowY: 'auto', paddingRight: 16, scrollBehavior: 'smooth', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)' }}>
              {isLoadingLyrics ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  Loading lyrics...
                </div>
              ) : lyrics.length > 0 ? (
                <div style={{ padding: '40px 0 100px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {lyrics.map((line, index) => {
                    const isActive = activeLyricIndex === index
                    return (
                      <div
                        key={index}
                        ref={isActive ? activeLyricRef : null}
                        style={{
                          fontSize: isActive || isPlainLyrics ? 28 : 24,
                          fontWeight: isActive || isPlainLyrics ? 800 : 500,
                          color: isActive || isPlainLyrics ? 'var(--text)' : 'rgba(255,255,255,0.3)',
                          transition: 'all 0.3s ease',
                          transformOrigin: 'left',
                          transform: isActive ? 'scale(1.05)' : 'scale(1)',
                          lineHeight: 1.4
                        }}
                      >
                        {line.text || ' '}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  No lyrics found for this track.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
