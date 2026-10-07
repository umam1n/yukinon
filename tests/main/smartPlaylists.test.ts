import { describe, it, expect } from 'vitest'
import { classifyTrack } from '@main/lib/classifier'
import { sanitizeSqlFilter, ALLOWED_COLUMNS } from '@main/lib/sqlSanitizer'

describe('Smart Playlists & Acoustic Classifier', () => {
  describe('classifyTrack Heuristics', () => {
    it('classifies ASMR content correctly', () => {
      const result = classifyTrack({
        title: 'Tingly Rain ASMR Binaural Whisper',
        artist: 'Relaxing sounds',
        duration: 1800
      })
      expect(result.contentType).toBe('asmr')
    })

    it('classifies Live recordings and flags isLive', () => {
      const result = classifyTrack({
        title: 'Comfortably Numb (Live in Pompeii 2016)',
        artist: 'David Gilmour',
        duration: 520
      })
      expect(result.isLive).toBe(true)
      expect(result.contentType).toBe('live')
    })

    it('classifies Soundtrack tracks', () => {
      const result = classifyTrack({
        title: 'Time (Inception OST)',
        artist: 'Hans Zimmer',
        album: 'Inception Original Soundtrack',
        genre: 'Soundtrack'
      })
      expect(result.contentType).toBe('soundtrack')
    })

    it('classifies Instrumental tracks and flags isInstrumental', () => {
      const result = classifyTrack({
        title: 'Clair de Lune (Piano Instrumental)',
        artist: 'Claude Debussy',
        genre: 'Classical'
      })
      expect(result.isInstrumental).toBe(true)
      expect(result.contentType).toBe('instrumental')
    })

    it('classifies Podcasts based on long duration and spoken genre', () => {
      const result = classifyTrack({
        title: 'Episode 42: The Audio Engineering Deep Dive',
        artist: 'Tech Talk Daily',
        duration: 3600,
        bitrate: 96000
      })
      expect(result.contentType).toBe('podcast')
    })

    it('infers mood from track title and genre', () => {
      const chillResult = classifyTrack({
        title: 'Midnight Coffee Lofi Chill Beats',
        genre: 'Lo-Fi'
      })
      expect(chillResult.suggestedMood).toBe('chill')

      const energeticResult = classifyTrack({
        title: 'High Octane Workout Hyperdrive',
        genre: 'Electronic'
      })
      expect(energeticResult.suggestedMood).toBe('energetic')
    })
  })

  describe('sanitizeSqlFilter Security & Parsing', () => {
    it('allows valid WHERE filters with whitelisted columns', () => {
      const filter1 = "content_type = 'music' AND is_live = 1"
      expect(sanitizeSqlFilter(filter1)).toBe(filter1)

      const filter2 = "genre LIKE '%Rock%' OR mood LIKE '%Chill%'"
      expect(sanitizeSqlFilter(filter2)).toBe(filter2)

      const filter3 = "year >= 1980 AND year <= 1989 AND bitrate >= 320000"
      expect(sanitizeSqlFilter(filter3)).toBe(filter3)

      const filter4 = "duration > 180 AND is_instrumental = 1"
      expect(sanitizeSqlFilter(filter4)).toBe(filter4)
    })

    it('permits empty filters and normalizes to 1=1', () => {
      expect(sanitizeSqlFilter('')).toBe('1=1')
      expect(sanitizeSqlFilter('   ')).toBe('1=1')
    })

    it('blocks SQL injection statements (DROP, UNION, INSERT, DELETE, semicolons)', () => {
      expect(() => sanitizeSqlFilter("1=1; DROP TABLE tracks;")).toThrow()
      expect(() => sanitizeSqlFilter("artist = 'Queen' UNION SELECT password FROM users")).toThrow()
      expect(() => sanitizeSqlFilter("title = 'Test'; INSERT INTO tracks VALUES ('x')")).toThrow()
      expect(() => sanitizeSqlFilter("1=1 -- comment bypass")).toThrow()
    })

    it('blocks non-whitelisted columns', () => {
      expect(() => sanitizeSqlFilter("password = 'admin'")).toThrow()
      expect(() => sanitizeSqlFilter("credit_card = '1234'")).toThrow()
      expect(() => sanitizeSqlFilter("non_existent_field = 'test'")).toThrow()
    })

    it('validates ALLOWED_COLUMNS set', () => {
      expect(ALLOWED_COLUMNS.has('content_type')).toBe(true)
      expect(ALLOWED_COLUMNS.has('is_instrumental')).toBe(true)
      expect(ALLOWED_COLUMNS.has('is_live')).toBe(true)
      expect(ALLOWED_COLUMNS.has('mood')).toBe(true)
      expect(ALLOWED_COLUMNS.has('genre')).toBe(true)
      expect(ALLOWED_COLUMNS.has('year')).toBe(true)
      expect(ALLOWED_COLUMNS.has('bitrate')).toBe(true)
      expect(ALLOWED_COLUMNS.has('duration')).toBe(true)
      expect(ALLOWED_COLUMNS.has('play_count')).toBe(true)
      expect(ALLOWED_COLUMNS.has('is_favorite')).toBe(true)
      expect(ALLOWED_COLUMNS.has('artist')).toBe(true)
      expect(ALLOWED_COLUMNS.has('album')).toBe(true)
      expect(ALLOWED_COLUMNS.has('title')).toBe(true)
      expect(ALLOWED_COLUMNS.has('format')).toBe(true)
    })
  })
})
