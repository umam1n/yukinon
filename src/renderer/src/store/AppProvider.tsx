import React, { useState, useCallback, useEffect, useRef } from 'react'
import { AppContext, type AppStore } from './AppContext'
import { audioEngine } from '../audio/AudioEngine'
import { LocalPlayer } from '../audio/LocalPlayer'
import { YTMPlayer } from '../audio/YTMPlayer'
import { RadioPlayer } from '../audio/RadioPlayer'
import { SubsonicPlayer } from '../audio/SubsonicPlayer'
import { JellyfinPlayer } from '../audio/JellyfinPlayer'
import type { IPlayerProvider } from '../audio/IPlayerProvider'
import type { Track, EQBands, EQPreset, AppTheme, PlayerState } from '../../../../shared/types'

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
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState<'off' | 'all' | 'one'>('off')
  const [playbackMode, setPlaybackMode] = useState<'normal' | 'shuffle' | 'repeat-all' | 'repeat-one'>('normal')
  const [isSmartPlay, setIsSmartPlay] = useState(false)
  const [activeModules, setActiveModulesState] = useState({ ytm: false, radio: false, subsonic: false, jellyfin: false })
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [renderAlbumArt, setRenderAlbumArtState] = useState(true)
  const [reduceBlur, setReduceBlurState] = useState(false)
  const renderAlbumArtRef = useRef(true)

  const [replaygainEnabled, setReplaygainEnabledState] = useState(true)
  const [replaygainPreamp, setReplaygainPreampState] = useState(0)
  const currentTrackRef = useRef<Track | null>(null)

  const setReplayGainEnabled = useCallback((enabled: boolean) => {
    setReplaygainEnabledState(enabled)
    window.yukinon.settings.set('replaygain_enabled', enabled ? 'true' : 'false')
    audioEngine.applyReplayGain(currentTrackRef.current, replaygainPreamp, enabled)
  }, [replaygainPreamp])

  const setReplayGainPreamp = useCallback((preamp: number) => {
    setReplaygainPreampState(preamp)
    window.yukinon.settings.set('replaygain_preamp', String(preamp))
    audioEngine.applyReplayGain(currentTrackRef.current, preamp, replaygainEnabled)
  }, [replaygainEnabled])

  const setRenderAlbumArt = useCallback((enabled: boolean) => {
    setRenderAlbumArtState(enabled)
    renderAlbumArtRef.current = enabled
    window.yukinon.settings.set('render_album_art', enabled ? 1 : 0)
  }, [])

  const setReduceBlur = useCallback((enabled: boolean) => {
    setReduceBlurState(enabled)
    window.yukinon.settings.set('reduce_blur', enabled ? 1 : 0)
    if (enabled) {
      document.documentElement.classList.add('reduce-blur')
    } else {
      document.documentElement.classList.remove('reduce-blur')
    }
  }, [])

  const notify = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => {
      setNotification((current) => (current?.message === message ? null : current))
    }, 3000)
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
    volume: 0.8,
    shuffle: false,
    repeat: 'off'
  })

  // Prevent React re-render cascades by keeping a mutable ref of the state
  const playerStateRef = useRef(player)
  const setPlayer = useCallback((state: Partial<PlayerState>) => {
    playerStateRef.current = { ...playerStateRef.current, ...state }
    setPlayerState(playerStateRef.current)
  }, [])

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => {
      const next = !prev
      setPlayer({ shuffle: next })
      if (activePlayerRef.current === ytmPlayerRef.current) {
        activePlayerRef.current?.shuffle?.()
      }
      return next
    })
  }, [setPlayer])

  const toggleRepeat = useCallback(() => {
    setRepeat((prev) => {
      const next = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'
      setPlayer({ repeat: next })
      if (activePlayerRef.current === ytmPlayerRef.current) {
        activePlayerRef.current?.repeat?.()
      }
      return next
    })
  }, [setPlayer])

  // Apply theme to DOM
  const applyThemeToDOM = useCallback((t: AppTheme) => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(t.mode)
    root.style.setProperty('--color-accent', t.accentColor)

    let hex = (t.accentColor || '#c084fc').replace('#', '')
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('')
    }
    const r = parseInt(hex.substring(0, 2), 16) || 192
    const g = parseInt(hex.substring(2, 4), 16) || 132
    const b = parseInt(hex.substring(4, 6), 16) || 252
    root.style.setProperty('--color-accent-rgb', `${r}, ${g}, ${b}`)
    root.style.setProperty('--color-accent-2', t.accent2Color || '#67e8f9')
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
      if (renderAlbumArtRef.current) {
        yukinon.library.getTrackArtwork(track.id).then((artwork) => {
          setPlayer({ artwork })
        })
      } else {
        setPlayer({ artwork: null })
      }
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
    currentTrackRef.current = track
    audioEngine.applyReplayGain(track, replaygainPreamp, replaygainEnabled)
  }, [setPlayer, replaygainPreamp, replaygainEnabled])

  const seekTo = useCallback((position: number) => {
    activePlayerRef.current?.seek(position)
    setPlayer({ position })
  }, [setPlayer])

  const setVolume = useCallback((volume: number) => {
    activePlayerRef.current?.setVolume(volume)
    setPlayer({ volume })
  }, [setPlayer])

  const playNextRef = useRef<() => void>()
  const playNext = useCallback(() => {
    if (activePlayerRef.current === ytmPlayerRef.current) {
      activePlayerRef.current?.next?.()
      return
    }

    if (queue.length > 0) {
      if (repeat === 'one') {
        seekTo(0)
        play(queue[currentQueueIndex])
        return
      }

      let nextIndex = currentQueueIndex

      if (shuffle) {
        if (queue.length > 1) {
          const r = Math.floor(Math.random() * (queue.length - 1))
          nextIndex = r >= currentQueueIndex ? r + 1 : r
        } else {
          nextIndex = 0
        }
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
      } else if (repeat === 'all') {
        nextIndex = (currentQueueIndex + 1) % queue.length
      } else {
        if (currentQueueIndex + 1 >= queue.length) {
          activePlayerRef.current?.pause()
          setPlayer({ status: 'stopped', position: 0 })
          return
        }
        nextIndex = currentQueueIndex + 1
      }

      setCurrentQueueIndex(nextIndex)
      play(queue[nextIndex])
    }
  }, [queue, currentQueueIndex, repeat, shuffle, isSmartPlay, play, seekTo, setPlayer])
  
  // Keep ref up to date
  useEffect(() => { playNextRef.current = playNext }, [playNext])

  const playPrev = useCallback(() => {
    if (activePlayerRef.current === ytmPlayerRef.current) {
      activePlayerRef.current?.prev?.()
      return
    }

    if (queue.length > 0) {
      if (repeat === 'one') {
        seekTo(0)
        play(queue[currentQueueIndex])
        return
      }

      let prevIndex = currentQueueIndex - 1
      if (prevIndex < 0) {
        if (repeat === 'all') {
          prevIndex = queue.length - 1
        } else {
          prevIndex = 0
        }
      }
      setCurrentQueueIndex(prevIndex)
      play(queue[prevIndex])
    }
  }, [queue, currentQueueIndex, repeat, play, seekTo])

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

  const playNextTrack = useCallback((track: Track) => {
    if (queue.length === 0) {
      setQueue([track], 0)
    } else {
      setQueueState((prev) => {
        const nextQueue = [...prev]
        nextQueue.splice(currentQueueIndex + 1, 0, track)
        return nextQueue
      })
    }
  }, [queue.length, currentQueueIndex, setQueue])

  const addToQueue = useCallback((track: Track) => {
    if (queue.length === 0) {
      setQueue([track], 0)
    } else {
      setQueueState((prev) => [...prev, track])
    }
  }, [queue.length, setQueue])

  const clearQueue = useCallback(() => {
    if (playerStateRef.current.status === 'playing' && queue[currentQueueIndex]) {
      setQueueState([queue[currentQueueIndex]])
      setCurrentQueueIndex(0)
    } else {
      activePlayerRef.current?.pause()
      setQueueState([])
      setCurrentQueueIndex(0)
      setPlayer({ status: 'stopped', currentTrackId: null, position: 0 })
    }
  }, [queue, currentQueueIndex, setPlayer])

  const removeFromQueue = useCallback((index: number) => {
    setQueueState((prev) => {
      const newQueue = [...prev]
      newQueue.splice(index, 1)

      setCurrentQueueIndex((prevIdx) => {
        if (newQueue.length === 0) return 0
        if (index < prevIdx) return prevIdx - 1
        if (prevIdx >= newQueue.length) return newQueue.length - 1
        return prevIdx
      })

      return newQueue
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

    yukinon.settings.get('render_album_art').then((val: any) => {
      if (val !== null && val !== undefined) {
        const enabled = val !== 0 && val !== false && val !== '0'
        setRenderAlbumArtState(enabled)
        renderAlbumArtRef.current = enabled
      }
    })

    yukinon.settings.get('reduce_blur').then((val: any) => {
      if (val !== null && val !== undefined) {
        const enabled = val === 1 || val === true || val === '1'
        setReduceBlurState(enabled)
        if (enabled) {
          document.documentElement.classList.add('reduce-blur')
        }
      }
    })

    yukinon.settings.get('replaygain_enabled').then((val: any) => {
      if (val !== null && val !== undefined) {
        setReplaygainEnabledState(val === true || val === 'true' || val === 1 || val === '1')
      }
    })

    yukinon.settings.get('replaygain_preamp').then((val: any) => {
      if (val !== null && val !== undefined) {
        setReplaygainPreampState(Number(val) || 0)
      }
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

    const unsubEq = yukinon.eq.onBandsChanged((bands) => {
      setEqBands(bands as EQBands)
      audioEngine.applyBands(bands as EQBands)
    })

    const unsubTheme = yukinon.theme.onChange((t) => {
      setThemeState((prev) => {
        const next = { ...prev, ...(t as Partial<AppTheme>) }
        applyThemeToDOM(next)
        return next
      })
    })

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

  return (
    <AppContext.Provider
      value={{
        tracks, setTracks,
        player, setPlayer,
        play, togglePlayPause, playNext, playPrev, seekTo, setVolume,
        queue,
        setQueue,
        addToQueue,
        playNextTrack,
        clearQueue,
        removeFromQueue,
        currentQueueIndex,
        shuffle,
        repeat,
        toggleShuffle,
        toggleRepeat,
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
        renderAlbumArt,
        setRenderAlbumArt,
        reduceBlur,
        setReduceBlur,
        replaygainEnabled,
        setReplayGainEnabled,
        replaygainPreamp,
        setReplayGainPreamp,
        notification,
        notify
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
