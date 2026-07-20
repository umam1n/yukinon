import React from 'react'
import {
  Library,
  Sliders,
  Settings,
  ListMusic,
  List,
  Radio,
  Cloud,
  Server
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import type { AppStore } from '../store/AppContext'

type NavItem = {
  id: AppStore['activeView']
  icon: React.ReactNode
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'library', icon: <Library size={20} />, label: 'Library' },
  { id: 'playlists', icon: <ListMusic size={20} />, label: 'Playlists' },
  { id: 'queue', icon: <List size={20} />, label: 'Queue' },
  { id: 'radio', icon: <Radio size={20} />, label: 'Radio' },
  { id: 'subsonic', icon: <Cloud size={20} />, label: 'Navidrome' },
  { id: 'jellyfin', icon: <Server size={20} />, label: 'Jellyfin' },
  { id: 'eq', icon: <Sliders size={20} />, label: 'EQ' },
  { id: 'settings', icon: <Settings size={20} />, label: 'Settings' }
]

export default function Sidebar(): React.ReactElement {
  const { activeView, setActiveView, activeModules } = useApp()

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.id === 'radio' && !activeModules.radio) return false
    if (item.id === 'subsonic' && !activeModules.subsonic) return false
    if (item.id === 'jellyfin' && !activeModules.jellyfin) return false
    return true
  })

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        zIndex: 100,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      className="hide-scrollbar"
    >
      {visibleItems.map(item => {
        const isActive = activeView === item.id
        return (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            style={{
              flex: '0 0 auto',
              width: 72,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              border: 'none',
              background: 'transparent',
              color: isActive ? 'var(--color-accent)' : 'var(--text-dim)',
              cursor: 'pointer',
              transition: 'color 0.15s',
              padding: 0,
              position: 'relative'
            }}
          >
            {item.icon}
            <span style={{
              fontSize: 9,
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '0.03em',
            }}>
              {item.label}
            </span>
            {isActive && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                width: 32,
                height: 3,
                background: 'var(--color-accent)',
                borderRadius: 100,
              }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
