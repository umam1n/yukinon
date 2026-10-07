import { ipcMain as IpcMain } from 'electron'
import { getDb, getSetting, setSetting } from '../db'
import { sanitizeSqlFilter } from '../lib/sqlSanitizer'

const SMART_PLAYLIST_SYSTEM_PROMPT = `You are an expert audio librarian for Yukinon Music Player.
Your job is to generate a smart dynamic playlist definition based on the user's prompt.
The playlist must filter Yukinon's SQLite database 'tracks' table.

Database schema columns:
- content_type: TEXT ('music', 'asmr', 'podcast', 'live', 'instrumental', 'soundtrack')
- is_instrumental: INTEGER (0 or 1)
- is_live: INTEGER (0 or 1)
- mood: TEXT (e.g. 'Chill', 'Energetic', 'Focus', 'Melancholic', 'Upbeat', 'Ambient', 'Dark', 'Uplifting')
- genre: TEXT (e.g. 'Rock', 'Electronic', 'Classical', 'Jazz', 'Pop', 'Lo-Fi', 'Metal')
- year: INTEGER
- bitrate: INTEGER (e.g. 320000 for 320kbps, 1411200 for CD lossless)
- duration: REAL (duration in seconds, e.g. 180 for 3 mins, 600 for 10 mins)
- play_count: INTEGER
- is_favorite: INTEGER (0 or 1)
- artist: TEXT
- album: TEXT
- title: TEXT
- format: TEXT ('flac', 'mp3', 'wav', 'aac', 'opus', etc.)

Allowed SQL syntax:
Only use WHERE clause boolean expressions (do not include the WHERE keyword).
Allowed operators: =, !=, <>, <, <=, >, >=, LIKE, NOT LIKE, IN, NOT IN, IS, IS NOT, AND, OR, NOT, BETWEEN.
String literals must use single quotes.

Return a JSON object with:
{
  "name": "Short catchy playlist name",
  "description": "Brief explanation of what's included",
  "icon": "A Lucide icon name: Sparkles, Music, Disc, Flame, Heart, Moon, Sun, Headphones, Radio, Mic, Zap, Coffee, CloudRain, Star, Shield, Trophy",
  "sqlFilter": "valid SQL condition using only the allowed columns"
}`

const ENRICH_TRACKS_SYSTEM_PROMPT = `You are Yukinon Music Player's audio classifier.
Analyze the provided audio track metadata (title, artist, album, genre, duration) and classify each track.
For each track, return:
- id: matching the input track id
- contentType: one of ['music', 'asmr', 'podcast', 'live', 'instrumental', 'soundtrack']
- isInstrumental: boolean (true if the track is instrumental, background music, or lacks prominent vocals)
- isLive: boolean (true if live recording, concert, festival, acoustic session)
- mood: string (one primary mood: 'Chill', 'Energetic', 'Focus', 'Melancholic', 'Upbeat', 'Ambient', 'Dark', 'Uplifting', or similar)
- aiTags: array of string tags (3-6 tags, e.g. ["late-night", "acoustic", "lo-fi"])

Return a JSON array of objects:
[
  {
    "id": "...",
    "contentType": "music",
    "isInstrumental": false,
    "isLive": false,
    "mood": "Chill",
    "aiTags": ["mellow", "guitar", "bedroom-pop"]
  }
]`

function cleanJsonText(raw: string): string {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }
  return cleaned.trim()
}

async function callGemini(apiKey: string, prompt: string, systemInstruction?: string): Promise<string> {
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash']
  let lastError: Error | null = null

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
      const body: any = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      }
      if (systemInstruction) {
        body.systemInstruction = {
          parts: [{ text: systemInstruction }]
        }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const errText = await res.text()
        if (res.status === 404) {
          lastError = new Error(`Model ${model} not found: ${errText}`)
          continue
        }
        throw new Error(`Gemini API error (${res.status}): ${errText}`)
      }

      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) {
        throw new Error('Gemini returned an empty response')
      }
      return text
    } catch (err: any) {
      lastError = err
      if (err.message && err.message.includes('404')) {
        continue
      }
      throw err
    }
  }
  throw lastError || new Error('Failed to communicate with Gemini API')
}

export function registerAiHandlers(ipc: typeof IpcMain): void {
  // Get stored API key
  ipc.handle('ai:getApiKey', () => {
    const key = getSetting('gemini_api_key')
    return typeof key === 'string' ? key : ''
  })

  // Set API key
  ipc.handle('ai:setApiKey', (_, apiKey: string) => {
    setSetting('gemini_api_key', (apiKey || '').trim())
    return { success: true }
  })

  // Test API key
  ipc.handle('ai:testKey', async (_, apiKey: string) => {
    const key = (apiKey || '').trim()
    if (!key) {
      return { valid: false, error: 'API key is empty' }
    }
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
      const res = await fetch(url)
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        const errMsg = errJson?.error?.message || `HTTP ${res.status}: ${res.statusText}`
        return { valid: false, error: errMsg }
      }
      return { valid: true }
    } catch (err: any) {
      return { valid: false, error: err.message || 'Connection failed' }
    }
  })

  // Generate Smart Playlist definition from prompt
  ipc.handle(
    'ai:generateSmartPlaylist',
    async (_, params: { prompt: string; apiKey?: string }) => {
      let key = (params.apiKey || '').trim()
      if (!key) {
        const stored = getSetting('gemini_api_key')
        if (typeof stored === 'string') key = stored.trim()
      }
      if (!key) {
        throw new Error('Gemini API key is not configured. Please add one in Settings.')
      }

      if (!params.prompt || !params.prompt.trim()) {
        throw new Error('Playlist prompt cannot be empty.')
      }

      const raw = await callGemini(
        key,
        `Generate a playlist for: "${params.prompt.trim()}"`,
        SMART_PLAYLIST_SYSTEM_PROMPT
      )

      const cleaned = cleanJsonText(raw)
      let parsed: { name?: string; description?: string; icon?: string; sqlFilter?: string }
      try {
        parsed = JSON.parse(cleaned)
      } catch (err) {
        throw new Error(`Failed to parse AI response as JSON: ${cleaned}`)
      }

      if (!parsed.name || !parsed.sqlFilter) {
        throw new Error('AI response was missing required name or sqlFilter')
      }

      // Sanitize SQL filter to protect against prompt injection or invalid syntax
      const safeFilter = sanitizeSqlFilter(parsed.sqlFilter)

      return {
        name: parsed.name,
        description: parsed.description || '',
        icon: parsed.icon || 'Sparkles',
        sqlFilter: safeFilter
      }
    }
  )

  // Enrich tracks batch with AI classification and tags
  ipc.handle(
    'ai:enrichTracksBatch',
    async (_, params?: { trackIds?: string[]; apiKey?: string }) => {
      let key = (params?.apiKey || '').trim()
      if (!key) {
        const stored = getSetting('gemini_api_key')
        if (typeof stored === 'string') key = stored.trim()
      }
      if (!key) {
        throw new Error('Gemini API key is not configured. Please add one in Settings.')
      }

      const db = getDb()
      let rows: Array<{
        id: string
        title: string
        artist: string
        album: string | null
        genre: string | null
        duration: number | null
      }> = []

      if (params?.trackIds && params.trackIds.length > 0) {
        const placeholders = params.trackIds.map(() => '?').join(',')
        rows = db
          .prepare(
            `SELECT id, title, artist, album, genre, duration FROM tracks WHERE id IN (${placeholders}) LIMIT 50`
          )
          .all(...params.trackIds) as typeof rows
      } else {
        rows = db
          .prepare(
            `SELECT id, title, artist, album, genre, duration FROM tracks WHERE ai_tags IS NULL OR ai_tags = '' LIMIT 30`
          )
          .all() as typeof rows
      }

      if (rows.length === 0) {
        return { updatedCount: 0, message: 'No tracks need AI enrichment.' }
      }

      const raw = await callGemini(
        key,
        `Classify these tracks:\n${JSON.stringify(rows, null, 2)}`,
        ENRICH_TRACKS_SYSTEM_PROMPT
      )

      const cleaned = cleanJsonText(raw)
      let enrichedItems: Array<{
        id: string
        contentType?: string
        isInstrumental?: boolean
        isLive?: boolean
        mood?: string
        aiTags?: string[] | string
      }>
      try {
        enrichedItems = JSON.parse(cleaned)
      } catch (err) {
        throw new Error(`Failed to parse AI enrichment response: ${cleaned}`)
      }

      if (!Array.isArray(enrichedItems)) {
        throw new Error('Expected JSON array of enriched tracks from AI')
      }

      const updateStmt = db.prepare(`
        UPDATE tracks
        SET content_type = ?, is_instrumental = ?, is_live = ?, mood = ?, ai_tags = ?
        WHERE id = ?
      `)

      const validContentTypes = ['music', 'asmr', 'podcast', 'live', 'instrumental', 'soundtrack']

      const updateTx = db.transaction((items) => {
        let count = 0
        for (const item of items) {
          if (!item.id) continue
          const cType = validContentTypes.includes(item.contentType) ? item.contentType : 'music'
          const isInst = item.isInstrumental ? 1 : 0
          const isLive = item.isLive ? 1 : 0
          const mood = typeof item.mood === 'string' ? item.mood.slice(0, 50) : null
          const tags = Array.isArray(item.aiTags)
            ? item.aiTags.join(', ')
            : typeof item.aiTags === 'string'
              ? item.aiTags
              : null

          updateStmt.run(cType, isInst, isLive, mood, tags, item.id)
          count++
        }
        return count
      })

      const updatedCount = updateTx(enrichedItems)
      return { updatedCount, message: `Successfully enriched ${updatedCount} tracks.` }
    }
  )
}
