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
  const { activeView, notification } = useApp()
  const showTitleBar = window.yukinon.platform === 'darwin'

  return (
    <div
      className="flex flex-col relative"
      style={{ height: '100vh', background: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* Custom Title Bar */}
      {showTitleBar && <TitleBar />}

      {/* Global Notification Toast */}
      {notification && (
        <div
          style={{
            position: 'absolute',
            top: showTitleBar ? 48 : 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 24px',
            borderRadius: 12,
            background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${notification.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: notification.type === 'success' ? '#34d399' : '#f87171',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            fontSize: 13,
            fontWeight: 500,
            pointerEvents: 'none'
          }}
        >
          {notification.message}
        </div>
      )}

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
