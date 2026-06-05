import React, { useState, useEffect, useCallback } from 'react'
import { Search, TrendingUp, Clock, Upload, ThumbsUp, Cpu, Tag } from 'lucide-react'
import { fetchCommunityPresets, publishPreset, upvotePreset, GENRES } from '../../lib/presets'
import { useApp } from '../../store/AppContext'
import type { CommunityPreset } from '../../../../../../shared/types'

export default function PresetsView(): React.ReactElement {
  const { eqBands, applyEqPreset, eqPresets } = useApp()
  const [presets, setPresets] = useState<CommunityPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'upvotes' | 'newest'>('upvotes')
  const [selectedGenre, setSelectedGenre] = useState('Any')
  const [deviceSearch, setDeviceSearch] = useState('')
  const [publishModalOpen, setPublishModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCommunityPresets({
        genre: selectedGenre === 'Any' ? undefined : selectedGenre,
        deviceModel: deviceSearch || undefined,
        sortBy
      })
      setPresets(data)
    } catch (e) {
      setError('Could not load community presets. Check your Supabase settings.')
    } finally {
      setLoading(false)
    }
  }, [sortBy, selectedGenre, deviceSearch])

  useEffect(() => {
    load()
  }, [load])

  const handleUpvote = useCallback(async (id: string) => {
    await upvotePreset(id)
    setPresets((prev) => prev.map((p) => (p.id === id ? { ...p, upvotes: p.upvotes + 1 } : p)))
  }, [])

  const handleApply = useCallback(
    (preset: CommunityPreset) => {
      applyEqPreset({ id: `community_${preset.id}`, name: preset.title, bands: preset.bands })
    },
    [applyEqPreset]
  )

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Community Presets</h2>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
              Browse, apply, and share EQ settings from the community
            </p>
          </div>
          <button
            onClick={() => setPublishModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--color-accent)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Upload size={14} />
            Publish My EQ
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Sort */}
          <div style={{ display: 'flex', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <FilterTab active={sortBy === 'upvotes'} onClick={() => setSortBy('upvotes')} icon={<TrendingUp size={13} />} label="Top" />
            <FilterTab active={sortBy === 'newest'} onClick={() => setSortBy('newest')} icon={<Clock size={13} />} label="New" />
          </div>

          {/* Genre */}
          <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)}>
            {GENRES.map((g) => <option key={g}>{g}</option>)}
          </select>

          {/* Device search */}
          <div style={{ position: 'relative' }}>
            <Cpu size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Filter by device..."
              value={deviceSearch}
              onChange={(e) => setDeviceSearch(e.target.value)}
              style={{
                paddingLeft: 28,
                padding: '6px 12px 6px 28px',
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 12,
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>
      </div>

      {/* Preset list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-dim)' }}>
            Loading presets...
          </div>
        )}
        {error && (
          <div style={{ textAlign: 'center', padding: '48px', color: '#ef4444' }}>{error}</div>
        )}
        {!loading && !error && presets.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-dim)' }}>
            No presets found. Be the first to publish one!
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {presets.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              onApply={handleApply}
              onUpvote={handleUpvote}
            />
          ))}
        </div>
      </div>

      {publishModalOpen && (
        <PublishModal
          bands={eqBands}
          onClose={() => setPublishModalOpen(false)}
          onPublished={() => { setPublishModalOpen(false); load() }}
        />
      )}
    </div>
  )
}

function PresetCard({
  preset,
  onApply,
  onUpvote
}: {
  preset: CommunityPreset
  onApply: (p: CommunityPreset) => void
  onUpvote: (id: string) => void
}): React.ReactElement {
  const bands = Object.values(preset.bands)
  const maxAbs = Math.max(...bands.map(Math.abs), 1)

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'border-color 0.2s',
        cursor: 'default'
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(var(--color-accent-rgb), 0.4)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)' }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{preset.title}</h3>
          <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>by {preset.authorName}</p>
        </div>
        <button
          onClick={() => onUpvote(preset.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            borderRadius: 20,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: 11,
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          title="Upvote"
        >
          <ThumbsUp size={11} />
          {preset.upvotes}
        </button>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {preset.genre && (
          <Tag_
            icon={<Tag size={10} />}
            label={preset.genre}
          />
        )}
        {preset.deviceModel && (
          <Tag_
            icon={<Cpu size={10} />}
            label={preset.deviceModel}
          />
        )}
      </div>

      {/* Mini EQ curve */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 }}>
        {bands.map((gain, i) => {
          const height = Math.abs(gain) / maxAbs * 36
          const isBoost = gain >= 0
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${height || 2}px`,
                borderRadius: 2,
                background: isBoost
                  ? `rgba(var(--color-accent-rgb), ${0.3 + (gain / maxAbs) * 0.7})`
                  : `rgba(var(--color-accent-rgb), 0.15)`,
                alignSelf: 'center'
              }}
            />
          )
        })}
      </div>

      {/* Apply button */}
      <button
        onClick={() => onApply(preset)}
        style={{
          width: '100%',
          padding: '8px',
          borderRadius: 8,
          border: 'none',
          background: 'rgba(var(--color-accent-rgb), 0.12)',
          color: 'var(--color-accent)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.15s'
        }}
      >
        Apply Preset
      </button>
    </div>
  )
}

function Tag_({ icon, label }: { icon: React.ReactNode; label: string }): React.ReactElement {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 20,
        background: 'var(--bg-3)',
        border: '1px solid var(--border)',
        fontSize: 10,
        color: 'var(--text-muted)',
        fontWeight: 500
      }}
    >
      {icon}
      {label}
    </span>
  )
}

function FilterTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }): React.ReactElement {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 500,
        border: 'none',
        cursor: 'pointer',
        background: active ? 'rgba(var(--color-accent-rgb), 0.15)' : 'transparent',
        color: active ? 'var(--color-accent)' : 'var(--text-muted)',
        transition: 'all 0.15s'
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function PublishModal({
  bands,
  onClose,
  onPublished
}: {
  bands: CommunityPreset['bands']
  onClose: () => void
  onPublished: () => void
}): React.ReactElement {
  const [title, setTitle] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [genre, setGenre] = useState('')
  const [deviceModel, setDeviceModel] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [err, setErr] = useState('')

  const handlePublish = async (): Promise<void> => {
    if (!title.trim()) { setErr('Please add a title'); return }
    setPublishing(true)
    setErr('')
    try {
      await publishPreset(title, authorName || 'Anonymous', bands, deviceModel || undefined, genre || undefined)
      onPublished()
    } catch (e) {
      setErr('Failed to publish. Check your Supabase connection.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(4px)'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 28,
          width: 420,
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)'
        }}
      >
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Publish EQ Preset</h3>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 20 }}>
          Share your current EQ settings with the community
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Preset Title *" value={title} onChange={setTitle} placeholder="e.g. Warm Bass for Sony WH-1000XM4" />
          <Field label="Your Name (optional)" value={authorName} onChange={setAuthorName} placeholder="Anonymous" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Genre</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">— Any —</option>
                {GENRES.filter(g => g !== 'Any').map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <Field label="Device Model" value={deviceModel} onChange={setDeviceModel} placeholder="e.g. AirPods Pro" />
          </div>
        </div>

        {err && (
          <p style={{ fontSize: 12, color: '#ef4444', marginTop: 10 }}>{err}</p>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: publishing ? 0.6 : 1 }}
          >
            {publishing ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }): React.ReactElement {
  return (
    <div>
      <label style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: 'var(--bg-3)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '8px 12px',
          color: 'var(--text)',
          fontSize: 13,
          outline: 'none',
          fontFamily: 'inherit'
        }}
      />
    </div>
  )
}
