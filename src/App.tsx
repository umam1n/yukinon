import React, { useEffect, useState, useCallback } from 'react'
import { AppProvider } from './store/AppProvider'
import Sidebar from './components/Sidebar'
import LibraryView from './components/Library/LibraryView'
import EQPanel from './components/EQ/EQPanel'
import PresetsView from './components/Presets/PresetsView'
import SettingsView from './components/Settings/SettingsView'
import NowPlaying from './components/NowPlaying'
import PlaylistsView from './components/Playlists/PlaylistsView'
import QueueView from './components/Queue/QueueView'
import RadioView from './components/Radio/RadioView'
import SubsonicView from './components/Subsonic/SubsonicView'
import JellyfinView from './components/Jellyfin/JellyfinView'
import { useApp } from './store/AppContext'
import FullscreenPlayer from './components/FullscreenPlayer'

function AppInner(): React.ReactElement {
  const { activeView, notification } = useApp()

  return (
    <div style={{ height: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999,
          padding: '10px 20px',
          borderRadius: 12,
          background: notification.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${notification.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
          color: notification.type === 'success' ? '#34d399' : '#f87171',
          backdropFilter: 'blur(8px)',
          fontSize: 13, fontWeight: 500,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          {notification.message}
        </div>
      )}

      {/* Page content — padded so it sits above the player bar + bottom tab */}
      <main style={{
        flex: 1,
        overflow: 'hidden',
        // bottom: 64px tab + 80px player = 144px; give a bit extra
        paddingBottom: activeView === 'fullscreen' ? 0 : 148,
      }}>
        {activeView === 'library'    && <LibraryView />}
        {activeView === 'playlists'  && <PlaylistsView />}
        {activeView === 'queue'      && <QueueView />}
        {activeView === 'radio'      && <RadioView />}
        {activeView === 'subsonic'   && <SubsonicView />}
        {activeView === 'jellyfin'   && <JellyfinView />}
        {activeView === 'eq'         && <EQPanel />}
        {activeView === 'presets'    && <PresetsView />}
        {activeView === 'settings'   && <SettingsView />}
        {activeView === 'fullscreen' && <FullscreenPlayer />}
      </main>

      {/* Floating player bar — above bottom tab */}
      {activeView !== 'fullscreen' && <NowPlaying />}

      {/* Fixed bottom tab bar */}
      <Sidebar />
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

declare global {
  interface Window { yukinon: any }
}
