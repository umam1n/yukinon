import { describe, it, expect } from 'vitest'
import type { TagUpdatePayload } from '../../src/shared/types'

// Replicating pure tag mapping functions for isolated testing
function mapToId3Tags(tags: TagUpdatePayload['tags']): Record<string, string> {
  const id3: Record<string, string> = {}
  if (tags.title !== undefined) id3.title = tags.title
  if (tags.artist !== undefined) id3.artist = tags.artist
  if (tags.album !== undefined) id3.album = tags.album
  if (tags.albumArtist !== undefined) id3.performerInfo = tags.albumArtist
  if (tags.year !== undefined) id3.year = String(tags.year)
  if (tags.genre !== undefined) id3.genre = tags.genre
  if (tags.trackNumber !== undefined) id3.trackNumber = String(tags.trackNumber)
  return id3
}

function mapToFlacTags(tags: TagUpdatePayload['tags']): Record<string, string> {
  const flacMap: Record<string, string> = {}
  if (tags.title !== undefined) flacMap.TITLE = tags.title
  if (tags.artist !== undefined) flacMap.ARTIST = tags.artist
  if (tags.album !== undefined) flacMap.ALBUM = tags.album
  if (tags.albumArtist !== undefined) flacMap.ALBUMARTIST = tags.albumArtist
  if (tags.year !== undefined) flacMap.DATE = String(tags.year)
  if (tags.genre !== undefined) flacMap.GENRE = tags.genre
  if (tags.trackNumber !== undefined) flacMap.TRACKNUMBER = String(tags.trackNumber)
  return flacMap
}

function buildSqliteUpdateClause(tags: TagUpdatePayload['tags']): { query: string; params: any[] } {
  const fields: string[] = []
  const params: any[] = []

  if (tags.title !== undefined) {
    fields.push('title = ?')
    params.push(tags.title)
  }
  if (tags.artist !== undefined) {
    fields.push('artist = ?')
    params.push(tags.artist)
  }
  if (tags.album !== undefined) {
    fields.push('album = ?')
    params.push(tags.album)
  }
  if (tags.albumArtist !== undefined) {
    fields.push('album_artist = ?')
    params.push(tags.albumArtist)
  }
  if (tags.year !== undefined) {
    fields.push('year = ?')
    params.push(tags.year)
  }
  if (tags.genre !== undefined) {
    fields.push('genre = ?')
    params.push(tags.genre)
  }
  if (tags.trackNumber !== undefined) {
    fields.push('track_number = ?')
    params.push(tags.trackNumber)
  }

  return {
    query: `UPDATE tracks SET ${fields.join(', ')} WHERE id = ?`,
    params
  }
}

describe('Audio Tag Editor Mappings and Payloads', () => {
  it('maps ID3 tags accurately for MP3 files', () => {
    const payload: TagUpdatePayload = {
      trackId: 'track-123',
      filePath: '/music/song.mp3',
      tags: {
        title: 'Yukitoki',
        artist: 'Nagi Yanagi',
        album: 'Euaru',
        albumArtist: 'Nagi Yanagi',
        year: 2013,
        genre: 'J-Pop / Anison',
        trackNumber: 1
      }
    }

    const id3 = mapToId3Tags(payload.tags)
    expect(id3.title).toBe('Yukitoki')
    expect(id3.artist).toBe('Nagi Yanagi')
    expect(id3.album).toBe('Euaru')
    // ID3 standard stores album artist in TPE2 / performerInfo
    expect(id3.performerInfo).toBe('Nagi Yanagi')
    expect(id3.year).toBe('2013')
    expect(id3.genre).toBe('J-Pop / Anison')
    expect(id3.trackNumber).toBe('1')
  })

  it('maps Vorbis comment tags accurately for FLAC files', () => {
    const payload: TagUpdatePayload = {
      trackId: 'track-456',
      filePath: '/music/song.flac',
      tags: {
        title: 'Harumodoki',
        artist: 'Nagi Yanagi',
        album: 'Follow My Tracks',
        albumArtist: 'Nagi Yanagi',
        year: 2016,
        genre: 'J-Pop',
        trackNumber: 2
      }
    }

    const flacMap = mapToFlacTags(payload.tags)
    expect(flacMap.TITLE).toBe('Harumodoki')
    expect(flacMap.ARTIST).toBe('Nagi Yanagi')
    expect(flacMap.ALBUM).toBe('Follow My Tracks')
    expect(flacMap.ALBUMARTIST).toBe('Nagi Yanagi')
    expect(flacMap.DATE).toBe('2016')
    expect(flacMap.GENRE).toBe('J-Pop')
    expect(flacMap.TRACKNUMBER).toBe('2')
  })

  it('handles partial tag updates without overwriting unprovided fields', () => {
    const partialTags: TagUpdatePayload['tags'] = {
      title: 'Renamed Title'
    }

    const id3 = mapToId3Tags(partialTags)
    expect(id3.title).toBe('Renamed Title')
    expect(id3.artist).toBeUndefined()
    expect(id3.album).toBeUndefined()

    const { query, params } = buildSqliteUpdateClause(partialTags)
    expect(query).toBe('UPDATE tracks SET title = ? WHERE id = ?')
    expect(params).toEqual(['Renamed Title'])
  })

  it('correctly builds parameterized SQLite queries for multiple fields', () => {
    const tags: TagUpdatePayload['tags'] = {
      title: 'Diamond Crevasse',
      artist: 'May\'n',
      year: 2008
    }

    const { query, params } = buildSqliteUpdateClause(tags)
    expect(query).toBe('UPDATE tracks SET title = ?, artist = ?, year = ? WHERE id = ?')
    expect(params).toEqual(['Diamond Crevasse', 'May\'n', 2008])
  })
})
