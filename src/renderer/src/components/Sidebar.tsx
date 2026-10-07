import React, { useState, useEffect } from 'react'
import {
  Library,
  Youtube,
  Sliders,
  Star,
  Settings,
  ListMusic,
  List,
  Radio,
  Cloud,
  Server,
  ChevronLeft
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import type { AppStore } from '../store/AppContext'

type NavItem = {
  id: AppStore['activeView']
  icon: React.ReactNode
  label: string
  title: string
  category: 'library' | 'streaming' | 'system'
}

const NAV_ITEMS: NavItem[] = [
  { id: 'library', icon: <Library size={20} />, label: 'Library', title: 'Library', category: 'library' },
  { id: 'playlists', icon: <ListMusic size={20} />, label: 'Playlists', title: 'Playlists', category: 'library' },
  { id: 'queue', icon: <List size={20} />, label: 'Queue', title: 'Queue', category: 'library' },
  { id: 'ytm', icon: <Youtube size={20} />, label: 'YTM', title: 'YouTube Music', category: 'streaming' },
  { id: 'radio', icon: <Radio size={20} />, label: 'Radio', title: 'Internet Radio', category: 'streaming' },
  { id: 'subsonic', icon: <Cloud size={20} />, label: 'Subsonic', title: 'Subsonic / Navidrome', category: 'streaming' },
  { id: 'jellyfin', icon: <Server size={20} />, label: 'Jellyfin', title: 'Jellyfin', category: 'streaming' },
  { id: 'eq', icon: <Sliders size={20} />, label: 'EQ', title: 'Equalizer', category: 'system' },
  { id: 'presets', icon: <Star size={20} />, label: 'Presets', title: 'Presets', category: 'system' },
  { id: 'settings', icon: <Settings size={20} />, label: 'Settings', title: 'Settings', category: 'system' }
]

export default function Sidebar(): React.ReactElement {
  const { activeView, setActiveView, activeModules } = useApp()
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  )

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isBottomNav = windowWidth < 500
  const isSlim = windowWidth >= 500 && windowWidth < 720
  const sidebarWidth = isSlim ? 52 : 72
  const showLabels = !isBottomNav && !isSlim
  const btnSize = isBottomNav ? 40 : isSlim ? 38 : 48

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.id === 'ytm' && !activeModules.ytm) return false
    if (item.id === 'radio' && !activeModules.radio) return false
    if (item.id === 'subsonic' && !activeModules.subsonic) return false
    if (item.id === 'jellyfin' && !activeModules.jellyfin) return false
    return true
  })

  return (
    <aside
      style={
        isBottomNav
          ? {
              height: 56,
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 60,
              width: '100%',
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'center',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-2)',
              display: 'flex',
              padding: '0 8px',
              overflowX: 'auto'
            }
          : {
              width: sidebarWidth,
              background: 'var(--bg)',
              borderRight: '1px solid var(--border)',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: 12,
              paddingBottom: 12,
              gap: 4
            }
      }
    >
      {visibleItems.map((item, index) => {
        const isActive = activeView === item.id
        const prevItem = visibleItems[index - 1]
        const showDivider = !isBottomNav && prevItem && prevItem.category !== item.category

        return (
          <React.Fragment key={item.id}>
            {showDivider && (
              <div
                style={{
                  width: isSlim ? 24 : 32,
                  height: 1,
                  background: 'var(--border)',
                  margin: '4px 0'
                }}
              />
            )}
            <button
              onClick={() => setActiveView(item.id)}
              title={item.title}
              style={{
                width: btnSize,
                height: btnSize,
                borderRadius: 6,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: showLabels ? 3 : 0,
                cursor: 'pointer',
                border: 'none',
                background: isActive ? 'rgba(var(--color-accent-rgb), 0.15)' : 'transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--text-dim)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                flexShrink: 0
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
              {item.icon}
              {showLabels && (
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {item.label}
                </span>
              )}
            </button>
          </React.Fragment>
        )
      })}

      {activeView === 'ytm' && (
        <button
          onClick={() => window.yukinon.ytm.goBack?.()}
          title="Go Back"
          style={{
            marginTop: 'auto',
            width: 48,
            height: 48,
            borderRadius: 6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-dim)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(var(--color-accent-rgb), 0.07)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)'
          }}
        >
          <ChevronLeft size={24} />
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            BACK
          </span>
        </button>
      )}
    </aside>
  )
}
