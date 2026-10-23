# Yukinon 🎵

> **Yukinon** is a hybrid, audiophile-focused music player for desktop. It combines a local high-fidelity library (FLAC, WAV, AIFF, etc.) with remote streaming integrations (Jellyfin, Navidrome/Subsonic, Internet Radio, and YouTube Music) under a single **Universal Playback Queue** and a real-time **10-band Equalizer**.

![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows%20%7C%20macOS-lightgrey)

---

## Key Features

- **Universal Playback Queue** — Queue up a local FLAC file, followed by a Jellyfin remote stream, followed by a Subsonic (Navidrome) track, followed by an Internet Radio stream—all playing seamlessly back-to-back.
- **Modular Integrations** — Inspired by players like *Namida*, Yukinon can be toggled to show only what you need. Turn off Jellyfin, Subsonic, Radio, or YouTube Music in Settings to declutter your sidebar and run a pure local-first playback experience.
- **Local Library** — Reads metadata and plays FLAC, WAV, AIFF, MP3, OGG, OPUS, and more. Displays audio quality markers (bit depth, sample rate, bitrate) directly on the interface.
- **Sleek Jellyfin Client UI** — Completely revamped tabbed interface supporting dedicated browsing of Albums, Artists, Songs, and Playlists from your Jellyfin server.
- **Navidrome / Subsonic Integration** — Seamlessly query, browse, and queue tracks from any Subsonic API-compatible server.
- **YouTube Music Integration** — Embedded isolation-aware Chromium view with integrated ad blocking via [@ghostery/adblocker-electron](https://github.com/ghostery/adblocker).
- **10-Band EQ & Device Profiles** — Web Audio API-powered equalizer that applies in real-time to all local and remote streams. Saves device-aware profiles so it automatically switches EQ presets when you connect different headphones or DACs.
- **Community Preset Store** — Browse, search, upvote, and publish custom EQ presets tagged by device model and music genre, backed by a Google Sheet via Apps Script.

---

## Inspiration & Predecessors

This project was built out of a passion for high-fidelity audio and self-hosted media, taking inspiration from several incredible open-source projects:

- **[Jellyfin](https://jellyfin.org/)** — For showing us how elegant personal media streaming and API client integration can be.
- **[Namida](https://github.com/naman14/Namida)** — A stunning Android music player that inspired our modular "enable/disable tab features" architecture, allowing users to tailor their layout exactly to their liking.
- **[Navidrome / Subsonic](https://github.com/navidrome/navidrome)** — For providing a lightweight, high-performance self-hosted API that makes music streaming accessible.
- **[YouTube Music Desktop App](https://github.com/th-ch/youtube-music)** — Inspiring our embedded Chromium-based YTM container and media key integration.

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/umam1n/yukinon
   cd yukinon
   ```

2. Configure Environment variables:
   ```bash
   cp .env.example .env
   # Optional: set VITE_PRESETS_API_URL for community presets
   ```

3. Install dependencies and run in development:
   ```bash
   npm install
   npm run dev
   ```

### Community Presets Setup (Optional)
Community EQ sharing uses a Google Sheet plus a small Apps Script web app. You don't need a server or a database. Follow [`backend/presets-appscript/README.md`](backend/presets-appscript/README.md), then put the web app URL in `.env` as `VITE_PRESETS_API_URL`.

---

## Legal & Licensing

This project is licensed under the terms of the [MIT License](LICENSE). 

YouTube Music integration is intended for **personal, non-commercial use only**, consistent with projects like [YouTube Music Desktop App](https://github.com/th-ch/youtube-music). Do not distribute this software commercially.
