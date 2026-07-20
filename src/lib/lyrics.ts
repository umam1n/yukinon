export interface LyricLine {
  time: number
  text: string
}

export async function fetchLyrics(
  source: string,
  id: string,
  title: string,
  artist: string,
  duration?: number
): Promise<string | null> {
  // 1. Check local file or embedded tags if source is 'local'
  if (source === 'local') {
    try {
      const localLyrics = await window.yukinon.library.getLyrics(id)
      if (localLyrics && localLyrics.trim().length > 0) {
        return localLyrics
      }
    } catch (err) {
      console.warn('Failed to fetch local lyrics:', err)
    }
  }

  // 2. Fetch from LRCLIB
  if (!title || !artist) return null

  try {
    const url = new URL('https://lrclib.net/api/get')
    url.searchParams.append('track_name', title)
    url.searchParams.append('artist_name', artist)
    if (duration) {
      url.searchParams.append('duration', Math.round(duration).toString())
    }

    const res = await fetch(url.toString())
    if (!res.ok) {
      // If we don't find it with exact duration, try searching without duration
      if (duration && res.status === 404) {
        return await fetchLyricsFallback(title, artist)
      }
      return null
    }
    
    const data = await res.json()
    // Prefer synced lyrics, fallback to plain text
    return data.syncedLyrics || data.plainLyrics || null
  } catch (err) {
    console.error('LRCLIB fetch error:', err)
    return null
  }
}

async function fetchLyricsFallback(title: string, artist: string): Promise<string | null> {
  try {
    const url = new URL('https://lrclib.net/api/search')
    url.searchParams.append('track_name', title)
    url.searchParams.append('artist_name', artist)
    const res = await fetch(url.toString())
    if (!res.ok) return null
    const results = await res.json()
    if (results && results.length > 0) {
      const best = results[0]
      return best.syncedLyrics || best.plainLyrics || null
    }
    return null
  } catch {
    return null
  }
}

export function parseLRC(raw: string): LyricLine[] {
  const lines = raw.split('\n')
  const parsed: LyricLine[] = []
  
  // Regex to match [mm:ss.xx] or [mm:ss:xx]
  const timeRegex = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/g

  for (const line of lines) {
    let match
    let hasTime = false
    while ((match = timeRegex.exec(line)) !== null) {
      hasTime = true
      const mins = parseInt(match[1], 10)
      const secs = parseInt(match[2], 10)
      const hundredths = parseInt(match[3], 10)
      
      const timeInSeconds = mins * 60 + secs + (hundredths / (match[3].length === 3 ? 1000 : 100))
      const text = line.replace(/\[\d{2}:\d{2}[.:]\d{2,3}\]/g, '').trim()
      
      parsed.push({ time: timeInSeconds, text })
    }
    
    // Handle plain text lyrics with no timestamps
    if (!hasTime && line.trim().length > 0) {
      // Give them a dummy time of 0 so they at least render
      // The UI will handle plain text lyrics gracefully by just showing them
      // We flag it as plain if the array has only time=0 entries
      parsed.push({ time: -1, text: line.trim() }) 
    }
  }

  // Sort by time
  parsed.sort((a, b) => a.time - b.time)
  return parsed
}
