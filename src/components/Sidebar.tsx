import React from 'react'
import {
  Library,
  Sliders,
  Settings,
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
  { id: 'library', icon: <Library size={22} />, label: 'Library' },
  { id: 'playlists', icon: <ListMusic size={22} />, label: 'Playlists' },
  { id: 'queue', icon: <List size={22} />, label: 'Queue' },
  { id: 'eq', icon: <Sliders size={22} />, label: 'EQ' },
  { id: 'settings', icon: <Settings size={22} />, label: 'Settings' }
]

export default function Sidebar(): React.ReactElement {
  const { activeView, setActiveView } = useApp()
  const [windowHeight, setWindowHeight] = React.useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800
  )

  React.useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isCompactHeight = windowHeight < 500

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: isCompactHeight ? 48 : 68,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        background: 'var(--bg-2)',
        borderTop: '1px solid var(--border)',
        zIndex: 100,
        paddingBottom: isCompactHeight ? '2px' : 'max(env(safe-area-inset-bottom, 0px), 6px)',
        boxSizing: 'border-box'
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeView === item.id
        return (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            style={{
              flex: 1,
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
              padding: 0
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isCompactHeight ? '2px 12px' : '4px 18px',
                borderRadius: 16,
                background: isActive ? 'rgba(var(--color-accent-rgb), 0.2)' : 'transparent',
                transition: 'background 0.2s'
              }}
            >
              {item.icon}
            </div>
            {!isCompactHeight && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--color-accent)' : 'var(--text-dim)',
                  letterSpacing: '0.02em'
                }}
              >
                {item.label}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
