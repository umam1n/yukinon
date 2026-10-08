import React, { useCallback, useState, useRef, useEffect } from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Music2,
  Shuffle,
  Repeat,
  Repeat1,
  Minimize2,
  ListMusic
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
  const {
    player,
    tracks,
    togglePlayPause,
    playNext,
    playPrev,
    shuffle,
    repeat,
    toggleShuffle,
    toggleRepeat,
    setActiveView,
    setVolume,
    seekTo,
    renderAlbumArt,
    reduceBlur
  } = useApp()

  const [isMuted, setIsMuted] = useState(false)
  const prevVolumeRef = useRef(player.volume > 0 ? player.volume : 0.5)
  const [showLyrics, setShowLyrics] = useState(false)
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false)
  const [isPlainLyrics, setIsPlainLyrics] = useState(false)
  const [dragPosition, setDragPosition] = useState<number | null>(null)
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 360,
    height: typeof window !== 'undefined' ? window.innerHeight : 640
  })

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isNarrowOrVertical =
    dimensions.width < 800 ||
    dimensions.height > dimensions.width * 1.05 ||
    dimensions.height < 550

  // Mobile swipe gesture tracking
  const touchStartY = useRef<number | null>(null)
  const touchDeltaY = useRef<number>(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchDeltaY.current = 0
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    touchDeltaY.current = e.touches[0].clientY - touchStartY.current
  }

  const handleTouchEnd = () => {
    if (touchDeltaY.current > 70) {
      setActiveView('library')
    }
    touchStartY.current = null
    touchDeltaY.current = 0
  }

  const currentTrack = tracks.find((t) => t.id === player.currentTrackId)
  const lyricsContainerRef = useRef<HTMLDivElement>(null)
  const activeLyricRef = useRef<HTMLDivElement>(null)

  const [lyricsOffset, setLyricsOffset] = useState<number>(() => {
    if (typeof window === 'undefined' || !player.currentTrackId) return 0
    const saved = localStorage.getItem(`lyrics_offset_${player.currentTrackId}`)
    return saved ? parseFloat(saved) || 0 : 0
  })

  useEffect(() => {
    if (!player.currentTrackId) {
      setLyricsOffset(0)
      return
    }
    const saved = localStorage.getItem(`lyrics_offset_${player.currentTrackId}`)
    setLyricsOffset(saved ? parseFloat(saved) || 0 : 0)
  }, [player.currentTrackId])

  const updateLyricsOffset = (newOffset: number) => {
    const rounded = Math.round(newOffset * 10) / 10
    setLyricsOffset(rounded)
    if (player.currentTrackId) {
      localStorage.setItem(`lyrics_offset_${player.currentTrackId}`, rounded.toString())
    }
  }

  const effectiveTime = Math.max(0, player.position + lyricsOffset)

  const title =
    player.source === 'ytm'
      ? player.ytmInfo?.title || 'YouTube Music'
      : player.source === 'radio'
      ? player.radioInfo?.title || 'Internet Radio'
      : player.source === 'subsonic'
      ? player.subsonicInfo?.title || 'Navidrome'
      : player.source === 'jellyfin'
      ? player.jellyfinInfo?.title || 'Jellyfin'
      : currentTrack?.title || 'Nothing playing'

  const artist =
    player.source === 'ytm'
      ? player.ytmInfo?.artist || ''
      : player.source === 'radio'
      ? player.radioInfo?.station || ''
      : player.source === 'subsonic'
      ? player.subsonicInfo?.artist || ''
      : player.source === 'jellyfin'
      ? player.jellyfinInfo?.artist || ''
      : currentTrack?.artist || '—'

  const artwork = player.artwork

  useEffect(() => {
    if (!showLyrics) return
    let isMounted = true

    async function loadLyrics() {
      setIsLoadingLyrics(true)
      setLyrics([])
      setIsPlainLyrics(false)
      if (!player.currentTrackId) return
      const raw = await fetchLyrics(player.source, player.currentTrackId, title, artist, player.duration)
      if (isMounted) {
        if (raw) {
          const parsed = parseLRC(raw)
          setLyrics(parsed)
          setIsPlainLyrics(parsed.every((l) => l.time === -1))
        }
        setIsLoadingLyrics(false)
      }
    }

    loadLyrics()
    return () => {
      isMounted = false
    }
  }, [showLyrics, player.currentTrackId, title, artist, player.duration, player.source])

  // Scroll to active lyric
  useEffect(() => {
    if (showLyrics && !isPlainLyrics && activeLyricRef.current && lyricsContainerRef.current) {
      activeLyricRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [effectiveTime, showLyrics, isPlainLyrics])

  const handleSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDragPosition(Number(e.target.value))
  }, [])

  const handleSeekEnd = useCallback(() => {
    if (dragPosition !== null) {
      seekTo(dragPosition)
      setDragPosition(null)
    }
  }, [dragPosition, seekTo])

  const handleVolume = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value)
      if (v > 0) {
        prevVolumeRef.current = v
        setIsMuted(false)
      } else {
        setIsMuted(true)
      }
      setVolume(v)
    },
    [setVolume]
  )

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    if (newMuted) {
      if (player.volume > 0) {
        prevVolumeRef.current = player.volume
      }
      setVolume(0)
    } else {
      const restored = prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.5
      setVolume(restored)
    }
  }, [isMuted, player.volume, setVolume])

  const progressPercent =
    player.duration > 0
      ? ((dragPosition !== null ? dragPosition : player.position) / player.duration) * 100
      : 0

  let activeLyricIndex = -1
  if (!isPlainLyrics && lyrics.length > 0) {
    for (let i = 0; i < lyrics.length; i++) {
      if (effectiveTime >= lyrics[i].time) {
        activeLyricIndex = i
      } else {
        break
      }
    }
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
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
      }}
    >
      {/* Dynamic blurred background */}
      {renderAlbumArt && !reduceBlur && artwork && (
        <div
          style={{
            position: 'absolute',
            top: -100,
            left: -100,
            right: -100,
            bottom: -100,
            backgroundImage: `url(${artwork})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(80px) brightness(0.25)',
            opacity: 0.55,
            zIndex: -1,
            transform: 'scale(1.1)'
          }}
        />
      )}

      {/* Top Bar with Minimize Button */}
      <div className="p-4 md:p-8 flex justify-end z-10">
        <button
          onClick={() => setActiveView('library')}
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text)',
            border: '1px solid var(--border)'
          }}
          className="p-3 rounded-full flex items-center justify-center transition-all active:scale-95"
          title="Minimize Player"
        >
          <Minimize2 size={24} />
        </button>
      </div>

      {/* Responsive layout wrapper */}
      <div className="flex-1 flex md:flex-row flex-col items-center justify-center gap-6 md:gap-16 px-6 md:px-16 overflow-y-auto pb-8 md:pb-0">
        {/* Left Side / Top: Artwork */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            width: isNarrowOrVertical ? 'min(240px, 32vh, 50vw)' : 'min(420px, 40vh)',
            height: isNarrowOrVertical ? 'min(240px, 32vh, 50vw)' : 'min(420px, 40vh)',
            borderRadius: isNarrowOrVertical ? 16 : 24
          }}
          className="shadow-2xl flex items-center justify-center overflow-hidden flex-shrink-0"
        >
          {renderAlbumArt && artwork ? (
            <img
              src={artwork}
              alt="artwork"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Music2 size={64} style={{ color: 'var(--text-dim)' }} />
          )}
        </div>

        {/* Right Side / Bottom: Track Info & Controls OR Lyrics */}
        <div className="flex flex-col flex-1 w-full max-w-[500px] md:h-[min(420px,40vh)] relative">
          {/* Default Controls View */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              opacity: showLyrics ? 0 : 1,
              pointerEvents: showLyrics ? 'none' : 'auto',
              transition: 'opacity 0.3s ease'
            }}
            className={showLyrics ? 'hidden' : 'w-full'}
          >
            {/* Title / Artist */}
            <div className="text-center md:text-left mb-6">
              <h1
                style={{
                  color: 'var(--text)',
                  fontSize: isNarrowOrVertical ? 'clamp(18px, 4.5vw, 32px)' : undefined,
                  textAlign: isNarrowOrVertical ? 'center' : undefined
                }}
                className="text-2xl md:text-4xl font-extrabold mb-1 line-clamp-2 leading-snug drop-shadow-md"
              >
                {title}
              </h1>
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: isNarrowOrVertical ? 'clamp(13px, 3vw, 18px)' : undefined,
                  textAlign: isNarrowOrVertical ? 'center' : undefined
                }}
                className="text-base md:text-xl font-medium"
              >
                {artist}
              </p>
            </div>

            {/* Scrubber */}
            <div className="flex flex-col gap-2 mb-6">
              <div
                style={{ background: 'var(--border)' }}
                className="relative h-2 rounded-full overflow-hidden"
              >
                <input
                  type="range"
                  min={0}
                  max={player.duration || 0}
                  value={dragPosition !== null ? dragPosition : player.position}
                  step={0.5}
                  onChange={handleSeekChange}
                  onMouseUp={handleSeekEnd}
                  onTouchEnd={handleSeekEnd}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div
                  style={{
                    height: '100%',
                    width: `${progressPercent}%`,
                    background: 'var(--color-accent)',
                    borderRadius: 9999,
                    boxShadow: '0 0 10px rgba(var(--color-accent-rgb), 0.5)'
                  }}
                />
              </div>
              <div
                style={{ color: 'var(--text-dim)' }}
                className="flex justify-between text-xs md:text-sm font-mono"
              >
                <span>{formatTime(dragPosition !== null ? dragPosition : player.position)}</span>
                <span>{formatTime(player.duration)}</span>
              </div>
            </div>

            {/* Main Playback Controls */}
            <div className="flex items-center justify-center md:justify-start gap-8 mb-6">
              <button
                onClick={toggleShuffle}
                title={shuffle ? 'Shuffle: On' : 'Shuffle: Off'}
                className="p-2 active:scale-90 transition-all"
                style={{ color: shuffle ? 'var(--color-accent)' : 'var(--text-dim)' }}
              >
                <Shuffle size={20} />
              </button>

              <button
                onClick={playPrev}
                className="p-2 active:scale-90 transition-all"
                style={{ color: 'var(--text)' }}
              >
                <SkipBack size={30} />
              </button>

              <button
                onClick={togglePlayPause}
                style={{
                  background: 'var(--color-accent)',
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(var(--color-accent-rgb), 0.4)'
                }}
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all"
              >
                {player.status === 'playing' ? (
                  <Pause size={30} fill="currentColor" />
                ) : (
                  <Play size={30} fill="currentColor" style={{ marginLeft: 4 }} />
                )}
              </button>

              <button
                onClick={playNext}
                className="p-2 active:scale-90 transition-all"
                style={{ color: 'var(--text)' }}
              >
                <SkipForward size={30} />
              </button>

              <button
                onClick={toggleRepeat}
                title={`Repeat: ${repeat === 'off' ? 'Off' : repeat === 'all' ? 'All' : 'One'}`}
                className="p-2 active:scale-90 transition-all"
                style={{ color: repeat !== 'off' ? 'var(--color-accent)' : 'var(--text-dim)' }}
              >
                {repeat === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
              </button>

              <button
                onClick={() => setShowLyrics(true)}
                className="p-2 active:scale-90 transition-all"
                style={{ color: 'var(--text-dim)' }}
              >
                <ListMusic size={20} />
              </button>
            </div>

            {/* Volume slider */}
            {dimensions.height >= 500 && (
              <div className="flex items-center gap-4 w-[180px] mx-auto md:mx-0">
                <button
                  onClick={toggleMute}
                  className="active:scale-90 transition-all"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : player.volume ?? 0.8}
                  onChange={handleVolume}
                  style={{
                    accentColor: 'var(--color-accent)',
                    background: 'var(--border)'
                  }}
                  className="flex-1 h-1 rounded-full cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Lyrics View */}
          <div
            style={{
              opacity: showLyrics ? 1 : 0,
              pointerEvents: showLyrics ? 'auto' : 'none',
              transition: 'opacity 0.3s ease',
              display: showLyrics ? 'flex' : 'none',
              flexDirection: 'column',
              height: '100%'
            }}
            className="w-full h-full"
          >
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg md:text-xl font-bold m-0" style={{ color: 'var(--text)' }}>
                  Lyrics
                </h2>
                {!isPlainLyrics && lyrics.length > 0 && (
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)'
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                  >
                    <span style={{ color: 'var(--text-dim)' }} className="text-[10px]">Sync:</span>
                    <button
                      onClick={() => updateLyricsOffset(lyricsOffset - 0.5)}
                      className="px-1.5 py-0.5 rounded bg-white/10 text-[10px]"
                    >
                      -0.5s
                    </button>
                    <button
                      onClick={() => updateLyricsOffset(lyricsOffset - 0.1)}
                      className="px-1.5 py-0.5 rounded bg-white/10 text-[10px]"
                    >
                      -0.1s
                    </button>
                    <span
                      style={{
                        color: lyricsOffset === 0 ? 'var(--text-dim)' : 'var(--color-accent)'
                      }}
                      className="min-w-[38px] text-center font-semibold text-[11px]"
                    >
                      {lyricsOffset > 0 ? `+${lyricsOffset.toFixed(1)}s` : `${lyricsOffset.toFixed(1)}s`}
                    </span>
                    <button
                      onClick={() => updateLyricsOffset(lyricsOffset + 0.1)}
                      className="px-1.5 py-0.5 rounded bg-white/10 text-[10px]"
                    >
                      +0.1s
                    </button>
                    <button
                      onClick={() => updateLyricsOffset(lyricsOffset + 0.5)}
                      className="px-1.5 py-0.5 rounded bg-white/10 text-[10px]"
                    >
                      +0.5s
                    </button>
                    {lyricsOffset !== 0 && (
                      <button
                        onClick={() => updateLyricsOffset(0)}
                        style={{ color: 'var(--text-dim)' }}
                        className="underline text-[10px] ml-1"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowLyrics(false)}
                style={{
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)'
                }}
                className="px-4 py-1.5 rounded-full text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div
              ref={lyricsContainerRef}
              style={{
                WebkitMaskImage:
                  'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)'
              }}
              className="flex-1 overflow-y-auto pr-2 scroll-smooth"
            >
              {isLoadingLyrics ? (
                <div
                  className="flex items-center justify-center h-full text-sm"
                  style={{ color: 'var(--text-dim)' }}
                >
                  Loading lyrics...
                </div>
              ) : lyrics.length > 0 ? (
                <div className="py-20 flex flex-col gap-6 text-center md:text-left">
                  {lyrics.map((line, index) => {
                    const isActive = activeLyricIndex === index
                    return (
                      <div
                        key={index}
                        ref={isActive ? activeLyricRef : null}
                        style={{
                          transition: 'all 0.3s ease',
                          color:
                            isActive || isPlainLyrics
                              ? 'var(--text)'
                              : 'var(--text-dim)'
                        }}
                        className={`text-lg md:text-2xl font-bold leading-relaxed ${
                          isActive || isPlainLyrics
                            ? 'scale-105 transform origin-center md:origin-left'
                            : ''
                        }`}
                      >
                        {line.text || ' '}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div
                  className="flex items-center justify-center h-full text-sm"
                  style={{ color: 'var(--text-dim)' }}
                >
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
