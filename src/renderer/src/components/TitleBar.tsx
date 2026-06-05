import React from 'react'
import { Minus, Square, X } from 'lucide-react'

export default function TitleBar(): React.ReactElement {
  return (
    <div
      className="flex items-center justify-between px-4"
      style={{
        height: 40,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0
      }}
    >
      {/* App name */}
      <div className="flex items-center gap-2 no-drag">
        <span
          className="text-sm font-semibold tracking-wider"
          style={{ color: 'var(--color-accent)', fontFamily: 'JetBrains Mono, monospace' }}
        >
          YUKINON
        </span>
      </div>

      {/* Window controls */}
      <div className="flex items-center gap-1 no-drag">
        <button
          onClick={() => window.aura.window.minimize()}
          className="w-8 h-8 flex items-center justify-center rounded-md transition-all hover:bg-white/10"
          style={{ color: 'var(--text-muted)' }}
          title="Minimize"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={() => window.aura.window.maximize()}
          className="w-8 h-8 flex items-center justify-center rounded-md transition-all hover:bg-white/10"
          style={{ color: 'var(--text-muted)' }}
          title="Maximize"
        >
          <Square size={12} />
        </button>
        <button
          onClick={() => window.aura.window.close()}
          className="w-8 h-8 flex items-center justify-center rounded-md transition-all hover:bg-red-500/80 hover:text-white"
          style={{ color: 'var(--text-muted)' }}
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
