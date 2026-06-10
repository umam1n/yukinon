import React, { useEffect, useState, useCallback } from 'react'
import { AppProvider } from './store/AppProvider'
import Sidebar from './components/Sidebar'
import LibraryView from './components/Library/LibraryView'
import EQPanel from './components/EQ/EQPanel'
import PresetsView from './components/Presets/PresetsView'
import SettingsView from './components/Settings/SettingsView'
import NowPlaying from './components/NowPlaying'
import TitleBar from './components/TitleBar'
import PlaylistsView from './components/Playlists/PlaylistsView'
import QueueView from './components/Queue/QueueView'
import RadioView from './components/Radio/RadioView'
import SubsonicView from './components/Subsonic/SubsonicView'
import JellyfinView from './components/Jellyfin/JellyfinView'
import { useApp } from './store/AppContext'

import FullscreenPlayer from './components/FullscreenPlayer'

// Inner app component that has access to context
function AppInner(): React.ReactElement {
  const { activeView } = useApp()
  const showTitleBar = window.yukinon.platform === 'darwin'

  return (
    <div
      className="flex flex-col"
      style={{ height: '100vh', background: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* Custom Title Bar */}
      {showTitleBar && <TitleBar />}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Page Content */}
        <main className="flex-1 overflow-hidden relative" style={{ paddingBottom: activeView === 'fullscreen' ? 0 : 110 }}>
          {activeView === 'library' && <LibraryView />}
          {activeView === 'playlists' && <PlaylistsView />}
          {activeView === 'queue' && <QueueView />}
          {activeView === 'radio' && <RadioView />}
          {activeView === 'subsonic' && <SubsonicView />}
          {activeView === 'jellyfin' && <JellyfinView />}
          {activeView === 'ytm' && <YTMPlaceholder />}
          {activeView === 'eq' && <EQPanel />}
          {activeView === 'presets' && <PresetsView />}
          {activeView === 'settings' && <SettingsView />}
          {activeView === 'fullscreen' && <FullscreenPlayer />}
        </main>
      </div>

      {/* Now Playing Bar */}
      {activeView !== 'fullscreen' && <NowPlaying />}
    </div>
  )
}

// YTM is actually rendered as a BrowserView overlay by the main process,
// so we just need to show/hide it via IPC
function YTMPlaceholder(): React.ReactElement {
  useEffect(() => {
    window.yukinon.ytm.show()
    return () => {
      window.yukinon.ytm.hide()
    }
  }, [])

  return (
    <div
      className="flex items-center justify-center h-full"
      style={{ color: 'var(--text-dim)' }}
    >
      <p className="text-sm">YouTube Music is loading in the overlay...</p>
    </div>
  )
}

export default function App(): React.ReactElement {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}

// Declare global window.yukinon type
declare global {
  interface Window {
    yukinon: import('../../preload/index').YukinonAPI
  }
}
