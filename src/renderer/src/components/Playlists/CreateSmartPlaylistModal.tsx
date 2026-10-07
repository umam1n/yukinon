import React, { useState } from 'react'
import {
  Sparkles,
  Sliders,
  X,
  Loader2,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Music,
  Disc,
  Flame,
  Heart,
  Moon,
  Sun,
  Headphones,
  Radio,
  Mic,
  Zap
} from 'lucide-react'

interface CreateSmartPlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (playlistId: string) => void
}

interface VisualRule {
  id: string
  field:
    | 'content_type'
    | 'is_instrumental'
    | 'is_live'
    | 'mood'
    | 'genre'
    | 'year'
    | 'bitrate'
    | 'duration'
    | 'is_favorite'
    | 'artist'
    | 'album'
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'is_true' | 'is_false'
  value: string
}

const AVAILABLE_ICONS = [
  'Sparkles',
  'Music',
  'Disc',
  'Flame',
  'Heart',
  'Moon',
  'Sun',
  'Headphones',
  'Radio',
  'Mic',
  'Zap'
]

export default function CreateSmartPlaylistModal({
  isOpen,
  onClose,
  onCreated
}: CreateSmartPlaylistModalProps): React.ReactElement | null {
  const [tab, setTab] = useState<'ai' | 'visual'>('ai')

  // Common fields
  const [name, setName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('Sparkles')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // AI Tab state
  const [aiPrompt, setAiPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedFilter, setGeneratedFilter] = useState('')
  const [generatedDesc, setGeneratedDesc] = useState('')

  // Visual Rule Builder state
  const [matchType, setMatchType] = useState<'AND' | 'OR'>('AND')
  const [rules, setRules] = useState<VisualRule[]>([
    { id: '1', field: 'content_type', operator: 'equals', value: 'music' }
  ])

  if (!isOpen) return null

  const handleAddRule = () => {
    setRules((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        field: 'genre',
        operator: 'contains',
        value: ''
      }
    ])
  }

  const handleRemoveRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  const handleRuleChange = (id: string, updates: Partial<VisualRule>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)))
  }

  const buildSqlFromRules = (): string => {
    const clauses: string[] = []

    for (const rule of rules) {
      const val = rule.value.replace(/'/g, "''").trim()

      if (rule.field === 'is_instrumental') {
        clauses.push(rule.operator === 'is_false' ? 'is_instrumental = 0' : 'is_instrumental = 1')
      } else if (rule.field === 'is_live') {
        clauses.push(rule.operator === 'is_false' ? 'is_live = 0' : 'is_live = 1')
      } else if (rule.field === 'is_favorite') {
        clauses.push(rule.operator === 'is_false' ? 'is_favorite = 0' : 'is_favorite = 1')
      } else if (['year', 'bitrate', 'duration'].includes(rule.field)) {
        const num = Number(val) || 0
        if (rule.operator === 'greater_than') {
          clauses.push(`${rule.field} >= ${num}`)
        } else if (rule.operator === 'less_than') {
          clauses.push(`${rule.field} <= ${num}`)
        } else {
          clauses.push(`${rule.field} = ${num}`)
        }
      } else if (rule.operator === 'contains') {
        if (val) clauses.push(`${rule.field} LIKE '%${val}%'`)
      } else {
        if (val) clauses.push(`${rule.field} = '${val}'`)
      }
    }

    if (clauses.length === 0) return '1=1'
    return clauses.join(` ${matchType} `)
  }

  const handleGenerateAi = async () => {
    if (!aiPrompt.trim()) {
      setError('Please enter a description for the playlist.')
      return
    }
    setError(null)
    setIsGenerating(true)

    try {
      const result = await window.yukinon.ai.generateSmartPlaylist({
        prompt: aiPrompt.trim()
      })

      setName(result.name)
      setGeneratedDesc(result.description || '')
      setGeneratedFilter(result.sqlFilter)
      if (AVAILABLE_ICONS.includes(result.icon)) {
        setSelectedIcon(result.icon)
      }
    } catch (err: any) {
      console.error('[AI] Generation error:', err)
      setError(err?.message || 'Failed to generate playlist. Check your Gemini API key in Settings.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreate = async () => {
    setError(null)
    const playlistName = name.trim()
    if (!playlistName) {
      setError('Playlist name is required.')
      return
    }

    let sqlFilter = ''
    let ruleJson: string | undefined

    if (tab === 'ai') {
      if (!generatedFilter.trim()) {
        setError('Please generate a playlist query first or enter a filter.')
        return
      }
      sqlFilter = generatedFilter.trim()
    } else {
      sqlFilter = buildSqlFromRules()
      ruleJson = JSON.stringify({ matchType, rules })
    }

    setIsSubmitting(true)
    try {
      const newId = await window.yukinon.playlists.createSmart({
        name: playlistName,
        ruleJson,
        sqlFilter,
        icon: selectedIcon
      })
      onCreated(newId)
      onClose()
    } catch (err: any) {
      console.error('[Playlists] Create smart playlist error:', err)
      setError(err?.message || 'Failed to create smart playlist.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 620,
          background: 'var(--bg-card, #18181b)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text, #fff)' }}>
                Create Smart Playlist
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted, #a1a1aa)' }}>
                Dynamic library filtering powered by heuristics & AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim, #71717a)',
              cursor: 'pointer',
              padding: 4
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            padding: '12px 24px 0 24px',
            gap: 8,
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
          }}
        >
          <button
            onClick={() => {
              setTab('ai')
              setError(null)
            }}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom: tab === 'ai' ? '2px solid var(--color-accent, #a855f7)' : '2px solid transparent',
              color: tab === 'ai' ? 'var(--text, #fff)' : 'var(--text-dim, #71717a)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Sparkles size={15} /> AI Generator (Gemini 2.5 Flash)
          </button>
          <button
            onClick={() => {
              setTab('visual')
              setError(null)
            }}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom:
                tab === 'visual' ? '2px solid var(--color-accent, #a855f7)' : '2px solid transparent',
              color: tab === 'visual' ? 'var(--text, #fff)' : 'var(--text-dim, #71717a)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Sliders size={15} /> Visual Rule Builder
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {tab === 'ai' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                    color: 'var(--text, #fff)'
                  }}
                >
                  What kind of playlist do you want?
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="e.g., Chill late-night lo-fi & ambient tracks, or 80s rock live recordings"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateAi()}
                    style={{
                      flex: 1,
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      padding: '10px 14px',
                      borderRadius: 8,
                      color: 'var(--text, #fff)',
                      outline: 'none',
                      fontSize: 13
                    }}
                  />
                  <button
                    onClick={handleGenerateAi}
                    disabled={isGenerating}
                    style={{
                      background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px 18px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: isGenerating ? 'not-allowed' : 'pointer',
                      opacity: isGenerating ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </div>

              {generatedFilter && (
                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}
                >
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-muted, #a1a1aa)', fontWeight: 600 }}>
                      Playlist Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: '100%',
                        marginTop: 4,
                        background: 'rgba(0,0,0,0.25)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        padding: '8px 12px',
                        borderRadius: 6,
                        color: 'var(--text, #fff)',
                        outline: 'none',
                        fontSize: 13,
                        fontWeight: 600
                      }}
                    />
                  </div>

                  {generatedDesc && (
                    <div style={{ fontSize: 12, color: 'var(--text-dim, #a1a1aa)', fontStyle: 'italic' }}>
                      "{generatedDesc}"
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-muted, #a1a1aa)', fontWeight: 600 }}>
                      Generated SQL Filter
                    </label>
                    <input
                      type="text"
                      value={generatedFilter}
                      onChange={(e) => setGeneratedFilter(e.target.value)}
                      style={{
                        width: '100%',
                        marginTop: 4,
                        background: 'rgba(0,0,0,0.35)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '8px 12px',
                        borderRadius: 6,
                        color: '#67e8f9',
                        fontFamily: 'monospace',
                        outline: 'none',
                        fontSize: 12
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                    color: 'var(--text, #fff)'
                  }}
                >
                  Playlist Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. My Favorites & Ambient"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    padding: '10px 14px',
                    borderRadius: 8,
                    color: 'var(--text, #fff)',
                    outline: 'none',
                    fontSize: 13
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text-dim, #a1a1aa)' }}>Match tracks that satisfy:</span>
                <select
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value as 'AND' | 'OR')}
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text, #fff)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    outline: 'none'
                  }}
                >
                  <option value="AND">ALL of the rules (AND)</option>
                  <option value="OR">ANY of the rules (OR)</option>
                </select>
              </div>

              {/* Rules list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'rgba(255,255,255,0.03)',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}
                  >
                    <select
                      value={rule.field}
                      onChange={(e) =>
                        handleRuleChange(rule.id, {
                          field: e.target.value as any,
                          operator:
                            ['is_instrumental', 'is_live', 'is_favorite'].includes(e.target.value)
                              ? 'is_true'
                              : ['year', 'bitrate', 'duration'].includes(e.target.value)
                                ? 'greater_than'
                                : 'contains'
                        })
                      }
                      style={{
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--text, #fff)',
                        borderRadius: 6,
                        padding: '6px 8px',
                        fontSize: 12,
                        outline: 'none'
                      }}
                    >
                      <option value="content_type">Content Type</option>
                      <option value="genre">Genre</option>
                      <option value="mood">Mood</option>
                      <option value="artist">Artist</option>
                      <option value="album">Album</option>
                      <option value="year">Year</option>
                      <option value="bitrate">Bitrate (bps)</option>
                      <option value="duration">Duration (sec)</option>
                      <option value="is_instrumental">Instrumental</option>
                      <option value="is_live">Live Recording</option>
                      <option value="is_favorite">Favorite</option>
                    </select>

                    {['is_instrumental', 'is_live', 'is_favorite'].includes(rule.field) ? (
                      <select
                        value={rule.operator}
                        onChange={(e) => handleRuleChange(rule.id, { operator: e.target.value as any })}
                        style={{
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'var(--text, #fff)',
                          borderRadius: 6,
                          padding: '6px 8px',
                          fontSize: 12,
                          outline: 'none'
                        }}
                      >
                        <option value="is_true">is Yes / True</option>
                        <option value="is_false">is No / False</option>
                      </select>
                    ) : ['year', 'bitrate', 'duration'].includes(rule.field) ? (
                      <>
                        <select
                          value={rule.operator}
                          onChange={(e) => handleRuleChange(rule.id, { operator: e.target.value as any })}
                          style={{
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--text, #fff)',
                            borderRadius: 6,
                            padding: '6px 8px',
                            fontSize: 12,
                            outline: 'none'
                          }}
                        >
                          <option value="greater_than">&gt;= Greater / Equal</option>
                          <option value="less_than">&lt;= Less / Equal</option>
                          <option value="equals">= Equals</option>
                        </select>
                        <input
                          type="number"
                          placeholder="Value"
                          value={rule.value}
                          onChange={(e) => handleRuleChange(rule.id, { value: e.target.value })}
                          style={{
                            flex: 1,
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--text, #fff)',
                            borderRadius: 6,
                            padding: '6px 8px',
                            fontSize: 12,
                            outline: 'none'
                          }}
                        />
                      </>
                    ) : rule.field === 'content_type' ? (
                      <select
                        value={rule.value}
                        onChange={(e) => handleRuleChange(rule.id, { value: e.target.value })}
                        style={{
                          flex: 1,
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'var(--text, #fff)',
                          borderRadius: 6,
                          padding: '6px 8px',
                          fontSize: 12,
                          outline: 'none'
                        }}
                      >
                        <option value="music">Music</option>
                        <option value="instrumental">Instrumental</option>
                        <option value="soundtrack">Soundtrack</option>
                        <option value="live">Live</option>
                        <option value="asmr">ASMR</option>
                        <option value="podcast">Podcast</option>
                      </select>
                    ) : (
                      <>
                        <select
                          value={rule.operator}
                          onChange={(e) => handleRuleChange(rule.id, { operator: e.target.value as any })}
                          style={{
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--text, #fff)',
                            borderRadius: 6,
                            padding: '6px 8px',
                            fontSize: 12,
                            outline: 'none'
                          }}
                        >
                          <option value="contains">Contains</option>
                          <option value="equals">Equals</option>
                        </select>
                        <input
                          type="text"
                          placeholder="e.g. Rock, Chill, etc."
                          value={rule.value}
                          onChange={(e) => handleRuleChange(rule.id, { value: e.target.value })}
                          style={{
                            flex: 1,
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--text, #fff)',
                            borderRadius: 6,
                            padding: '6px 8px',
                            fontSize: 12,
                            outline: 'none'
                          }}
                        />
                      </>
                    )}

                    <button
                      onClick={() => handleRemoveRule(rule.id)}
                      disabled={rules.length <= 1}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: rules.length <= 1 ? 'rgba(255,255,255,0.2)' : '#f87171',
                        cursor: rules.length <= 1 ? 'not-allowed' : 'pointer',
                        padding: 4
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddRule}
                style={{
                  alignSelf: 'flex-start',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text, #fff)',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Plus size={14} /> Add Rule
              </button>

              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted, #71717a)', fontFamily: 'monospace' }}>
                Filter Preview: {buildSqlFromRules()}
              </div>
            </div>
          )}

          {/* Icon Selector */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 8,
                color: 'var(--text-muted, #a1a1aa)'
              }}
            >
              Choose Icon
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {AVAILABLE_ICONS.map((iconName) => {
                const isSelected = selectedIcon === iconName
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setSelectedIcon(iconName)}
                    style={{
                      background: isSelected ? 'var(--color-accent, #a855f7)' : 'rgba(255,255,255,0.05)',
                      color: isSelected ? 'white' : 'var(--text-dim, #a1a1aa)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    {iconName === 'Sparkles' && <Sparkles size={14} />}
                    {iconName === 'Music' && <Music size={14} />}
                    {iconName === 'Disc' && <Disc size={14} />}
                    {iconName === 'Flame' && <Flame size={14} />}
                    {iconName === 'Heart' && <Heart size={14} />}
                    {iconName === 'Moon' && <Moon size={14} />}
                    {iconName === 'Sun' && <Sun size={14} />}
                    {iconName === 'Headphones' && <Headphones size={14} />}
                    {iconName === 'Radio' && <Radio size={14} />}
                    {iconName === 'Mic' && <Mic size={14} />}
                    {iconName === 'Zap' && <Zap size={14} />}
                    <span>{iconName}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            background: 'rgba(0,0,0,0.1)'
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'var(--text, #fff)',
              borderRadius: 8,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isSubmitting || (tab === 'ai' && !generatedFilter)}
            style={{
              background: 'var(--color-accent, #a855f7)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '9px 20px',
              fontSize: 13,
              fontWeight: 600,
              cursor: isSubmitting || (tab === 'ai' && !generatedFilter) ? 'not-allowed' : 'pointer',
              opacity: isSubmitting || (tab === 'ai' && !generatedFilter) ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Create Smart Playlist
          </button>
        </div>
      </div>
    </div>
  )
}
