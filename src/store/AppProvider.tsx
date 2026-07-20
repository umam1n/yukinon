import React, { useState, useCallback, useEffect, useRef } from 'react'
import { AppContext, type AppStore } from './AppContext'
import { audioEngine } from '../audio/AudioEngine'
import { LocalPlayer } from '../audio/LocalPlayer'
import { YTMPlayer } from '../audio/YTMPlayer'
import { RadioPlayer } from '../audio/RadioPlayer'
import { SubsonicPlayer } from '../audio/SubsonicPlayer'
import { JellyfinPlayer } from '../audio/JellyfinPlayer'
import type { IPlayerProvider } from '../audio/IPlayerProvider'
import type { Track, EQBands, EQPreset, AppTheme, PlayerState } from '@shared/types'

const yukinon = window.yukinon

const DEFAULT_BANDS: EQBands = {
  32: 0, 64: 0, 125: 0, 250: 0, 500: 0,
  1000: 0, 2000: 0, 4000: 0, 8000: 0, 16000: 0
}

export function AppProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  // Orchestrator State
  const localPlayerRef = useRef<LocalPlayer | null>(null)
  const ytmPlayerRef = useRef<YTMPlayer | null>(null)
  const radioPlayerRef = useRef<RadioPlayer | null>(null)
  const subsonicPlayerRef = useRef<SubsonicPlayer | null>(null)
  const jellyfinPlayerRef = useRef<JellyfinPlayer | null>(null)
  const activePlayerRef = useRef<IPlayerProvider | null>(null)

  const [tracks, setTracks] = useState<Track[]>([])
  const [queue, setQueueState] = useState<Track[]>([])
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0)
  const [eqBands, setEqBands] = useState<EQBands>(DEFAULT_BANDS)
  const [eqPresets, setEqPresets] = useState<EQPreset[]>([])
  const [activePresetId, setActivePresetId] = useState('flat')
  const [theme, setThemeState] = useState<AppTheme>({
    mode: 'dark',
    accentColor: '#c084fc',
    accent2Color: '#67e8f9'
  })
  const [activeView, setActiveView] = useState<AppStore['activeView']>('library')
  const [playbackMode, setPlaybackMode] = useState<'normal' | 'shuffle' | 'repeat-all' | 'repeat-one'>('normal')
  const [isSmartPlay, setIsSmartPlay] = useState(false)
  const [activeModules, setActiveModulesState] = useState({ ytm: false, radio: false, subsonic: false, jellyfin: false })
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const notify = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => {
      setNotification((current) => (current?.message === message ? null : current))
    }, 3000)
  }, [])

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    isDestructive?: boolean
    resolve: (value: boolean) => void
  } | null>(null)

  const confirm = useCallback((options: {
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    isDestructive?: boolean
  }): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmDialog({
        ...options,
        resolve: (val) => {
          setConfirmDialog(null)
          resolve(val)
        }
      })
    })
  }, [])

  const setActiveModules = useCallback((updates: Partial<{ ytm: boolean; radio: boolean; subsonic: boolean; jellyfin: boolean }>) => {
    setActiveModulesState((prev) => {
      const next = { ...prev, ...updates }
      window.yukinon.settings.set('active_modules', next)
      return next
    })
  }, [])
  
  const [player, setPlayerState] = useState<PlayerState>({
    source: 'local',
    status: 'stopped',
    currentTrackId: null,
    position: 0,
    duration: 0,
    volume: 0.8
  })

  // Prevent React re-render cascades by keeping a mutable ref of the state
  const playerStateRef = useRef(player)
  const setPlayer = useCallback((state: Partial<PlayerState>) => {
    playerStateRef.current = { ...playerStateRef.current, ...state }
    setPlayerState(playerStateRef.current)
  }, [])

  // Apply theme to DOM
  const applyThemeToDOM = useCallback((t: AppTheme) => {
    if (!t) return
    const mode = t.mode || 'dark'
    const accentColor = t.accentColor || '#3b82f6'
    const accent2Color = t.accent2Color || '#8b5cf6'

    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(mode)
    root.style.setProperty('--color-accent', accentColor)

    const hex = accentColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    root.style.setProperty('--color-accent-rgb', `${r}, ${g}, ${b}`)
    root.style.setProperty('--color-accent-2', accent2Color)
  }, [])

  const setTheme = useCallback(
    (updates: Partial<AppTheme>) => {
      const newTheme = { ...theme, ...updates }
      setThemeState(newTheme)
      applyThemeToDOM(newTheme)
      yukinon.theme.set(updates)
      yukinon.ytm.setTheme?.(newTheme.accentColor, newTheme.mode)
    },
    [theme, applyThemeToDOM]
  )

  const play = useCallback(async (track: Track) => {
    // Pause YTM and all other players implicitly by setting lock
    yukinon.ytm.setLock?.(true)
    ytmPlayerRef.current?.pause()
    localPlayerRef.current?.pause()
    radioPlayerRef.current?.pause()
    subsonicPlayerRef.current?.pause()
    jellyfinPlayerRef.current?.pause()

    if (track.source === 'local') {
      activePlayerRef.current = localPlayerRef.current
      setPlayer({ source: 'local' })
      await localPlayerRef.current?.play(track)
      yukinon.library.getTrackArtwork(track.id).then((artwork: any) => {
        setPlayer({ artwork })
      })
    } else if (track.source === 'radio') {
      activePlayerRef.current = radioPlayerRef.current
      setPlayer({ source: 'radio' })
      await radioPlayerRef.current?.play(track)
    } else if (track.source === 'subsonic') {
      activePlayerRef.current = subsonicPlayerRef.current
      setPlayer({ source: 'subsonic' })
      await subsonicPlayerRef.current?.play(track)
    } else if (track.source === 'jellyfin') {
      activePlayerRef.current = jellyfinPlayerRef.current
      setPlayer({ source: 'jellyfin' })
      await jellyfinPlayerRef.current?.play(track)
    }

    activePlayerRef.current?.setVolume(playerStateRef.current.volume)
  }, [setPlayer])

  const playNextRef = useRef<() => void>()
  const playNext = useCallback(() => {
    if (activePlayerRef.current === ytmPlayerRef.current) {
      activePlayerRef.current?.next?.()
      return
    }

    if (queue.length > 0) {
      let nextIndex = currentQueueIndex

      if (playbackMode === 'repeat-one') {
        // Just play the exact same index again
      } else if (isSmartPlay) {
        const candidates = queue.map((t, i) => {
          let score = 1
          if (t.isFavorite) score += 5
          if (t.playCount) score += t.playCount
          return { index: i, score }
        })
        const totalScore = candidates.reduce((acc, c) => acc + c.score, 0)
        let r = Math.random() * totalScore
        for (const c of candidates) {
          r -= c.score
          if (r <= 0) {
            nextIndex = c.index
            break
          }
        }
      } else if (playbackMode === 'shuffle') {
        nextIndex = Math.floor(Math.random() * queue.length)
      } else {
        if (currentQueueIndex + 1 >= queue.length && playbackMode === 'normal') {
          activePlayerRef.current?.pause()
          setPlayer({ status: 'stopped', position: 0 })
          return
        }
        nextIndex = (currentQueueIndex + 1) % queue.length
      }

      setCurrentQueueIndex(nextIndex)
      play(queue[nextIndex])
    }
  }, [queue, currentQueueIndex, playbackMode, isSmartPlay, play, setPlayer])
  
  // Keep ref up to date
  useEffect(() => { playNextRef.current = playNext }, [playNext])

  const playPrev = useCallback(() => {
    if (activePlayerRef.current === ytmPlayerRef.current) {
      activePlayerRef.current?.prev?.()
      return
    }

    if (queue.length > 0) {
      const prevIndex = (currentQueueIndex - 1 + queue.length) % queue.length
      setCurrentQueueIndex(prevIndex)
      play(queue[prevIndex])
    }
  }, [queue, currentQueueIndex, play])

  const togglePlayPause = useCallback(() => {
    if (activePlayerRef.current) {
      if (playerStateRef.current.status === 'playing') {
        activePlayerRef.current.pause()
        if (activePlayerRef.current === localPlayerRef.current) {
          yukinon.ytm.setLock?.(false) // Release lock so user can interact with YTM freely
        }
      } else {
        if (activePlayerRef.current === localPlayerRef.current || activePlayerRef.current === radioPlayerRef.current || activePlayerRef.current === subsonicPlayerRef.current || activePlayerRef.current === jellyfinPlayerRef.current) {
          yukinon.ytm.setLock?.(true)
          ytmPlayerRef.current?.pause()
        }
        activePlayerRef.current.resume()
      }
    }
  }, [])

  const seekTo = useCallback((position: number) => {
    activePlayerRef.current?.seek(position)
    setPlayer({ position })
  }, [setPlayer])

  const setVolume = useCallback((volume: number) => {
    activePlayerRef.current?.setVolume(volume)
    setPlayer({ volume })
  }, [setPlayer])

  const setQueue = useCallback(
    (newQueue: Track[], startIndex = 0) => {
      setQueueState(newQueue)
      setCurrentQueueIndex(startIndex)
      if (newQueue.length > 0) {
        play(newQueue[startIndex])
      }
    },
    [play]
  )

  const addToQueue = useCallback((track: Track) => {
    setQueueState((prev) => [...prev, track])
  }, [])

  const removeFromQueue = useCallback((index: number) => {
    setQueueState((prev) => {
      const newQueue = [...prev]
      newQueue.splice(index, 1)
      return newQueue
    })
    setCurrentQueueIndex((prevIdx) => {
      if (index < prevIdx) return prevIdx - 1
      if (index === prevIdx) {
        // If we removed the currently playing track, we should probably handle playback stopping or playing next,
        // but for now let's just keep it at the same index so it plays the next track in the queue naturally.
        return prevIdx
      }
      return prevIdx
    })
  }, [])

  // Initialize Players and Global Listeners
  useEffect(() => {
    localPlayerRef.current = new LocalPlayer()
    ytmPlayerRef.current = new YTMPlayer()
    radioPlayerRef.current = new RadioPlayer()
    subsonicPlayerRef.current = new SubsonicPlayer()
    jellyfinPlayerRef.current = new JellyfinPlayer()
    activePlayerRef.current = localPlayerRef.current

    // Subscribe to LocalPlayer
    const unsubLocal = localPlayerRef.current.onStateChange((state) => {
      if (activePlayerRef.current === localPlayerRef.current) {
        setPlayer(state)
        if (state.status === 'stopped') {
          playNextRef.current?.()
        }
      }
    })

    // Subscribe to YTMPlayer
    const unsubYTM = ytmPlayerRef.current.onStateChange((state) => {
      // If YTM starts playing, it steals the orchestrator focus
      if (state.status === 'playing' && activePlayerRef.current !== ytmPlayerRef.current) {
        localPlayerRef.current?.pause()
        activePlayerRef.current = ytmPlayerRef.current
        yukinon.ytm.setLock?.(false)
      }
      // Update UI if YTM is the active source or if it's broadcasting metadata
      if (activePlayerRef.current === ytmPlayerRef.current || state.status === 'playing' || state.ytmInfo) {
         setPlayer(state)
      }
    })

    // Subscribe to RadioPlayer
    const unsubRadio = radioPlayerRef.current.onStateChange((state) => {
      if (activePlayerRef.current === radioPlayerRef.current) {
        setPlayer(state)
      }
    })

    // Subscribe to SubsonicPlayer
    const unsubSubsonic = subsonicPlayerRef.current.onStateChange((state) => {
      if (activePlayerRef.current === subsonicPlayerRef.current) {
        setPlayer(state)
        if (state.status === 'stopped') {
          playNextRef.current?.()
        }
      }
    })

    // Subscribe to JellyfinPlayer
    const unsubJellyfin = jellyfinPlayerRef.current.onStateChange((state) => {
      if (activePlayerRef.current === jellyfinPlayerRef.current) {
        setPlayer(state)
        if (state.status === 'stopped') {
          playNextRef.current?.()
        }
      }
    })

    // Initial setup
    yukinon.theme.get().then((t: AppTheme) => {
      setThemeState(t)
      applyThemeToDOM(t)
    })

    yukinon.settings.get('active_modules').then((m: any) => {
      if (m) setActiveModulesState(m)
    })

    yukinon.library.getTracks().then(setTracks)

    Promise.all([yukinon.eq.getBands(), yukinon.eq.getPresets(), yukinon.eq.getActivePresetId()]).then(
      ([bands, presets, presetId]) => {
        setEqBands(bands as EQBands)
        setEqPresets(presets as EQPreset[])
        setActivePresetId(presetId as string)
        audioEngine.applyBands(bands as EQBands)
      }
    )

    const unsubEq = yukinon.eq.onBandsChanged((bands: any) => {
      setEqBands(bands as EQBands)
      audioEngine.applyBands(bands as EQBands)
    })

    const unsubTheme = yukinon.theme.onChange((t: any) => {
      setThemeState((prev) => {
        const next = { ...prev, ...(t as Partial<AppTheme>) }
        applyThemeToDOM(next)
        return next
      })
    })

    if (yukinon.settings?.getPreampGain) {
      yukinon.settings.getPreampGain().then((val: number) => audioEngine.setPreampGain(val))
    }
    const unsubPreamp = yukinon.settings?.onPreampUpdated?.((val: number) => {
      audioEngine.setPreampGain(val)
    }) || (() => {})

    // Media keys
    const unsubPlay = yukinon.media.onPlayPause(togglePlayPause)
    const unsubNext = yukinon.media.onNext(() => playNextRef.current?.())
    const unsubPrev = yukinon.media.onPrev(playPrev)

    return () => {
      unsubLocal()
      unsubYTM()
      unsubRadio()
      unsubSubsonic()
      unsubJellyfin()
      localPlayerRef.current?.destroy()
      ytmPlayerRef.current?.destroy()
      radioPlayerRef.current?.destroy()
      subsonicPlayerRef.current?.destroy()
      jellyfinPlayerRef.current?.destroy()
      unsubEq()
      unsubTheme()
      unsubPreamp()
      unsubPlay()
      unsubNext()
      unsubPrev()
    }
  }, []) // We use refs for functions inside to prevent re-initializing players

  const setEqBand = useCallback((band: keyof EQBands, gain: number) => {
    setEqBands((prev) => ({ ...prev, [band]: gain }))
    audioEngine.setGain(
      [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000].indexOf(Number(band)),
      gain
    )
    yukinon.eq.setBand(Number(band), gain)
  }, [])

  const applyEqPreset = useCallback((preset: EQPreset) => {
    setEqBands(preset.bands)
    setActivePresetId(preset.id)
    audioEngine.applyBands(preset.bands)
    yukinon.eq.applyPreset(preset.id)
  }, [])

  const saveEqPreset = useCallback(
    async (name: string) => {
      const saved = await yukinon.eq.savePreset(name, eqBands)
      setEqPresets((prev) => [...prev, saved as EQPreset])
    },
    [eqBands]
  )

  // Synchronize player metadata with native MediaSession for Android backgrounds/lockscreen controls
  useEffect(() => {
    if ('mediaSession' in navigator) {
      const currentTrack = tracks.find(t => t.id === player.currentTrackId)
      
      let title = 'Nothing playing'
      let artist = '—'
      let album = ''
      let artworkUrl = player.artwork || ''

      if (player.source === 'ytm') {
        title = player.ytmInfo?.title || 'YouTube Music'
        artist = player.ytmInfo?.artist || ''
      } else if (player.source === 'radio') {
        title = player.radioInfo?.title || 'Internet Radio'
        artist = player.radioInfo?.station || ''
      } else if (player.source === 'subsonic') {
        title = player.subsonicInfo?.title || 'Navidrome'
        artist = player.subsonicInfo?.artist || ''
      } else if (player.source === 'jellyfin') {
        title = player.jellyfinInfo?.title || 'Jellyfin'
        artist = player.jellyfinInfo?.artist || ''
      } else if (currentTrack) {
        title = currentTrack.title
        artist = currentTrack.artist
        album = currentTrack.album || ''
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album,
        artwork: artworkUrl ? [{ src: artworkUrl, sizes: '512x512', type: 'image/png' }] : []
      })
      
      navigator.mediaSession.playbackState = player.status === 'playing' ? 'playing' : 'paused'
    }
  }, [player.currentTrackId, player.status, player.artwork, player.ytmInfo, player.radioInfo, player.subsonicInfo, player.jellyfinInfo, tracks])

  // Setup MediaSession native button listeners
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => togglePlayPause())
      navigator.mediaSession.setActionHandler('pause', () => togglePlayPause())
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrev())
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext())
      try {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined) seekTo(details.seekTime)
        })
      } catch (e) {
        console.warn('seekto action handler not supported')
      }
    }
  }, [togglePlayPause, playPrev, playNext, seekTo])

  return (
    <AppContext.Provider
      value={{
        tracks, setTracks,
        player, setPlayer,
        play, togglePlayPause, playNext, playPrev, seekTo, setVolume,
        queue,
        setQueue,
        addToQueue,
        removeFromQueue,
        currentQueueIndex,
        playbackMode,
        togglePlaybackMode: () => {
          setPlaybackMode((prev) => {
            let nextMode = 'normal'
            if (prev === 'normal') nextMode = 'shuffle'
            else if (prev === 'shuffle') nextMode = 'repeat-all'
            else if (prev === 'repeat-all') nextMode = 'repeat-one'
            
            if (activePlayerRef.current === ytmPlayerRef.current) {
              if (nextMode === 'shuffle') activePlayerRef.current?.shuffle?.()
              else if (nextMode.startsWith('repeat')) activePlayerRef.current?.repeat?.()
              else if (nextMode === 'normal') activePlayerRef.current?.repeat?.() // cycle back
            }
            
            return nextMode as typeof playbackMode
          })
        },
        isSmartPlay,
        toggleSmartPlay: () => setIsSmartPlay(!isSmartPlay),
        eqBands, setEqBand, applyEqPreset,
        eqPresets, activePresetId, setActivePresetId, saveEqPreset,
        theme, setTheme,
        activeView, setActiveView,
        activeModules,
        setActiveModules,
        notification,
        notify,
        confirm
      }}
    >
      {children}
      
      {confirmDialog && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 5, 10, 0.75)',
          backdropFilter: 'blur(10px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }} onClick={() => confirmDialog.resolve(false)}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(20,20,35,0.9), rgba(10,10,20,0.95))',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            width: 340,
            maxWidth: '90%',
            padding: 24,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>
              {confirmDialog.title}
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                onClick={() => confirmDialog.resolve(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 16px',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {confirmDialog.cancelText || 'Cancel'}
              </button>
              <button
                onClick={() => confirmDialog.resolve(true)}
                style={{
                  background: confirmDialog.isDestructive ? '#ef4444' : 'var(--color-accent)',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 16px',
                  color: confirmDialog.isDestructive ? '#fff' : '#000',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: confirmDialog.isDestructive ? '0 4px 12px rgba(239,68,68,0.2)' : 'none'
                }}
              >
                {confirmDialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  )
}
