import { describe, it, expect } from 'vitest'
import {
  normalizeTitle,
  normalizeArtist,
  isDurationMatch,
  calculateTrackQualityScore,
  clusterDuplicateTracks
} from '@main/lib/duplicates'
import type { Track } from '@shared/types'

describe('Cross-Album Duplicate Scanner', () => {
  describe('normalizeTitle', () => {
    it('strips leading track numbers and prefixes', () => {
      expect(normalizeTitle('01 - Bohemian Rhapsody')).toBe('bohemian rhapsody')
      expect(normalizeTitle('02. Hotel California')).toBe('hotel california')
      expect(normalizeTitle('10 Stairway to Heaven')).toBe('stairway to heaven')
      expect(normalizeTitle('1 - Yesterday')).toBe('yesterday')
    })

    it('strips remaster, reissue, and deluxe edition tags', () => {
      expect(normalizeTitle('In the End (2020 Remaster)')).toBe('in the end')
      expect(normalizeTitle('Smells Like Teen Spirit [Deluxe Edition]')).toBe('smells like teen spirit')
      expect(normalizeTitle('Karma Police (Remastered 2017)')).toBe('karma police')
      expect(normalizeTitle('Come As You Are - 2011 Remaster')).toBe('come as you are')
      expect(normalizeTitle('Paranoid Android (Anniversary Edition)')).toBe('paranoid android')
    })

    it('strips feat. / ft. artist suffixes', () => {
      expect(normalizeTitle('Stan (feat. Dido)')).toBe('stan')
      expect(normalizeTitle('Love The Way You Lie ft. Rihanna')).toBe('love the way you lie')
    })

    it('removes accents, punctuation, and extra whitespace', () => {
      expect(normalizeTitle('Café del Mar (Live!)')).toBe('cafe del mar')
      expect(normalizeTitle('Héroes')).toBe('heroes')
    })
  })

  describe('normalizeArtist', () => {
    it('strips leading "The "', () => {
      expect(normalizeArtist('The Beatles')).toBe('beatles')
      expect(normalizeArtist('The Rolling Stones')).toBe('rolling stones')
    })

    it('strips featured artists', () => {
      expect(normalizeArtist('Eminem feat. Rihanna')).toBe('eminem')
      expect(normalizeArtist('Gorillaz ft. Del the Funky Homosapien')).toBe('gorillaz')
      expect(normalizeArtist('Daft Punk featuring Pharrell Williams')).toBe('daft punk')
    })

    it('normalizes accents and special characters', () => {
      expect(normalizeArtist('Beyoncé')).toBe('beyonce')
      expect(normalizeArtist('Björk')).toBe('bjork')
      expect(normalizeArtist('Mötley Crüe')).toBe('motley crue')
    })
  })

  describe('isDurationMatch', () => {
    it('matches tracks within 3.5s tolerance or 3% relative delta', () => {
      expect(isDurationMatch(200, 202)).toBe(true) // diff is 2s (<= 3.5s)
      expect(isDurationMatch(200, 203.4)).toBe(true) // diff is 3.4s (<= 3.5s)
      expect(isDurationMatch(1000, 1020)).toBe(true) // diff is 20s, but 20/1000 = 2% (< 3%)
    })

    it('rejects tracks with divergent durations', () => {
      expect(isDurationMatch(200, 215)).toBe(false)
      expect(isDurationMatch(180, 240)).toBe(false)
    })

    it('handles zero or null durations gracefully', () => {
      expect(isDurationMatch(null, 200)).toBe(false)
      expect(isDurationMatch(200, 0)).toBe(false)
    })
  })

  describe('calculateTrackQualityScore', () => {
    it('prioritizes high bit depth and sample rate FLAC over standard FLAC', () => {
      const hiResFlac: Partial<Track> = {
        format: 'flac',
        bitDepth: 24,
        sampleRate: 96000,
        bitrate: 2800000
      }
      const cdFlac: Partial<Track> = {
        format: 'flac',
        bitDepth: 16,
        sampleRate: 44100,
        bitrate: 1411200
      }
      expect(calculateTrackQualityScore(hiResFlac)).toBeGreaterThan(calculateTrackQualityScore(cdFlac))
    })

    it('prioritizes CD FLAC over 320kbps MP3', () => {
      const cdFlac: Partial<Track> = {
        format: 'flac',
        bitDepth: 16,
        sampleRate: 44100,
        bitrate: 1411200
      }
      const mp3320: Partial<Track> = {
        format: 'mp3',
        bitDepth: 16,
        sampleRate: 44100,
        bitrate: 320000
      }
      expect(calculateTrackQualityScore(cdFlac)).toBeGreaterThan(calculateTrackQualityScore(mp3320))
    })

    it('prioritizes 320kbps MP3 over 128kbps MP3', () => {
      const mp3320: Partial<Track> = {
        format: 'mp3',
        bitDepth: 16,
        sampleRate: 44100,
        bitrate: 320000
      }
      const mp3128: Partial<Track> = {
        format: 'mp3',
        bitDepth: 16,
        sampleRate: 44100,
        bitrate: 128000
      }
      expect(calculateTrackQualityScore(mp3320)).toBeGreaterThan(calculateTrackQualityScore(mp3128))
    })
  })

  describe('clusterDuplicateTracks', () => {
    it('identifies cross-album duplicates and marks the lower quality track for removal', () => {
      const hiResTrack: Track = {
        id: '1',
        path: '/music/Album1/01. Bohemian Rhapsody.flac',
        title: '01. Bohemian Rhapsody',
        artist: 'Queen',
        album: 'A Night at the Opera (2011 Remaster)',
        duration: 354.2,
        format: 'flac',
        bitDepth: 24,
        sampleRate: 96000,
        bitrate: 3000000,
        playCount: 10,
        isFavorite: false,
        source: 'local'
      }

      const mp3Track: Track = {
        id: '2',
        path: '/music/Greatest Hits/Bohemian Rhapsody (Remastered).mp3',
        title: 'Bohemian Rhapsody (Remastered)',
        artist: 'Queen',
        album: 'Greatest Hits',
        duration: 355.0,
        format: 'mp3',
        bitDepth: 16,
        sampleRate: 44100,
        bitrate: 320000,
        playCount: 2,
        isFavorite: false,
        source: 'local'
      }

      const differentTrack: Track = {
        id: '3',
        path: '/music/Queen/Radio Ga Ga.flac',
        title: 'Radio Ga Ga',
        artist: 'Queen',
        album: 'The Works',
        duration: 344.0,
        format: 'flac',
        bitDepth: 16,
        sampleRate: 44100,
        bitrate: 1411200,
        playCount: 0,
        isFavorite: false,
        source: 'local'
      }

      const clusters = clusterDuplicateTracks([hiResTrack, mp3Track, differentTrack])
      expect(clusters).toHaveLength(1)
      expect(clusters[0].primary.id).toBe('1') // Hi-Res FLAC kept
      expect(clusters[0].duplicates).toHaveLength(1)
      expect(clusters[0].duplicates[0].id).toBe('2') // MP3 marked duplicate
    })
  })
})
