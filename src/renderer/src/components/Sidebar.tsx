import React from 'react'
import {
  Library,
  Youtube,
  Sliders,
  Star,
  Settings,
  Music2,
  ListMusic,
  List
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
  { id: 'ytm', icon: <Youtube size={20} />, label: 'YouTube Music' },
  { id: 'eq', icon: <Sliders size={20} />, label: 'Equalizer' },
  { id: 'presets', icon: <Star size={20} />, label: 'Presets' },
  { id: 'settings', icon: <Settings size={20} />, label: 'Settings' }
]

export default function Sidebar(): React.ReactElement {
  const { activeView, setActiveView } = useApp()

  return (
    <aside
      style={{
        width: 72,
        background: 'var(--bg)',
        borderRight: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 12,
        gap: 4
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeView === item.id
        return (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            title={item.label}
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              cursor: 'pointer',
              border: 'none',
              background: isActive ? 'rgba(var(--color-accent-rgb), 0.15)' : 'transparent',
              color: isActive ? 'var(--color-accent)' : 'var(--text-dim)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(var(--color-accent-rgb), 0.07)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)'
              }
            }}
          >
            {/* Active indicator dot */}
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  left: 4,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 3,
                  height: 16,
                  borderRadius: 100,
                  background: 'var(--color-accent)'
                }}
              />
            )}
            {item.icon}
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {item.label.split(' ')[0]}
            </span>
          </button>
        )
      })}
    </aside>
  )
}
