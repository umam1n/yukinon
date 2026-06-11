import { Jellyfin } from '@jellyfin/sdk'

export interface JellyfinConfig {
  url: string
  username: string
  password?: string
  accessToken?: string
  userId?: string
}

let config: JellyfinConfig | null = null

const jellyfin = new Jellyfin({
  clientInfo: {
    name: 'Yukinon',
    version: '0.1.0'
  },
  deviceInfo: {
    name: 'Yukinon Player',
    id: 'yukinon-client-id'
  }
})

let api: any = null

export function sanitizeJellyfinUrl(url: string): string {
  try {
    let cleaned = url.trim()
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = 'http://' + cleaned
    }
    const parsed = new URL(cleaned)
    return parsed.origin
  } catch (e) {
    return url.trim()
  }
}

export function setJellyfinConfig(c: JellyfinConfig) {
  config = {
    ...c,
    url: sanitizeJellyfinUrl(c.url)
  }
  if (config.url) {
    api = jellyfin.createApi(config.url)
    if (config.accessToken) {
      api.accessToken = config.accessToken
    }
  }
}

export function getJellyfinConfig(): JellyfinConfig | null {
  return config
}

export async function login(): Promise<void> {
  if (!config || !api) throw new Error('Jellyfin config not set')
  
  if (config.accessToken) {
    // Already logged in
    return
  }

  if (config.password) {
    // We use standard fetch for login as SDK API requires typing that can be complex to guess without intellisense
    const safeUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
    const res = await fetch(`${safeUrl}/Users/AuthenticateByName`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="Yukinon", Device="Yukinon Player", DeviceId="yukinon-client-id", Version="0.1.0"`
      },
      body: JSON.stringify({
        Username: config.username,
        Pw: config.password
      })
    })

    if (!res.ok) {
      throw new Error(`Jellyfin Login Error: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()
    config.accessToken = data.AccessToken
    config.userId = data.SessionInfo?.UserId || data.User?.Id
    api.accessToken = config.accessToken
    return
  }

  throw new Error('No password or accessToken provided')
}

export async function getAlbums(parentId?: string) {
  if (!config || !api) throw new Error('Jellyfin config not set')
  const safeUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
  
  const params = new URLSearchParams({
    IncludeItemTypes: 'MusicAlbum',
    Recursive: 'true',
    SortBy: 'DateCreated,SortName',
    SortOrder: 'Descending',
    api_key: config.accessToken!
  })
  
  if (parentId) params.append('ParentId', parentId)
  
  const res = await fetch(`${safeUrl}/Users/${config.userId}/Items?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch albums')
  return await res.json()
}

export async function getAlbumTracks(albumId: string) {
  if (!config || !api) throw new Error('Jellyfin config not set')
  const safeUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
  
  const params = new URLSearchParams({
    IncludeItemTypes: 'Audio',
    ParentId: albumId,
    SortBy: 'ParentIndexNumber,IndexNumber,SortName',
    api_key: config.accessToken!
  })
  
  const res = await fetch(`${safeUrl}/Users/${config.userId}/Items?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch tracks')
  return await res.json()
}

export function getCoverArtUrl(id: string, size = 300): string {
  if (!config || !api) return ''
  const safeUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
  return `${safeUrl}/Items/${id}/Images/Primary?fillHeight=${size}&fillWidth=${size}&quality=96`
}

export async function getStreamUrl(id: string): Promise<string> {
  if (!config || !api) throw new Error('Jellyfin config not set')
  const safeUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
  return `${safeUrl}/Items/${id}/Download?api_key=${config.accessToken}`
}

export async function getArtists() {
  if (!config || !api) throw new Error('Jellyfin config not set')
  const safeUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
  
  const params = new URLSearchParams({
    IncludeItemTypes: 'MusicArtist',
    Recursive: 'true',
    SortBy: 'SortName',
    SortOrder: 'Ascending',
    api_key: config.accessToken!
  })
  
  const res = await fetch(`${safeUrl}/Users/${config.userId}/Items?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch artists')
  return await res.json()
}

export async function getSongs() {
  if (!config || !api) throw new Error('Jellyfin config not set')
  const safeUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
  
  const params = new URLSearchParams({
    IncludeItemTypes: 'Audio',
    Recursive: 'true',
    SortBy: 'SortName',
    SortOrder: 'Ascending',
    api_key: config.accessToken!
  })
  
  const res = await fetch(`${safeUrl}/Users/${config.userId}/Items?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch songs')
  return await res.json()
}

export async function getPlaylists() {
  if (!config || !api) throw new Error('Jellyfin config not set')
  const safeUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
  
  const params = new URLSearchParams({
    IncludeItemTypes: 'Playlist',
    Recursive: 'true',
    SortBy: 'SortName',
    SortOrder: 'Ascending',
    api_key: config.accessToken!
  })
  
  const res = await fetch(`${safeUrl}/Users/${config.userId}/Items?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch playlists')
  return await res.json()
}

export async function getArtistTracks(artistId: string) {
  if (!config || !api) throw new Error('Jellyfin config not set')
  const safeUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
  
  const params = new URLSearchParams({
    IncludeItemTypes: 'Audio',
    ArtistIds: artistId,
    Recursive: 'true',
    SortBy: 'SortName',
    SortOrder: 'Ascending',
    api_key: config.accessToken!
  })
  
  const res = await fetch(`${safeUrl}/Users/${config.userId}/Items?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch artist tracks')
  return await res.json()
}


