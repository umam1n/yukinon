# Aura 🎵

> Hybrid audiophile music player — local FLAC library + YouTube Music, with a 10-band EQ, device-aware profiles, and community preset sharing.

![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows%20%7C%20macOS-lightgrey)

## Features

- **Local Library** — Plays FLAC, WAV, AIFF, MP3, OGG, OPUS and more. Displays bit depth, sample rate, and bitrate.
- **YouTube Music** — Embedded Chromium view with integrated ad blocking via [@ghostery/adblocker-electron](https://github.com/ghostery/adblocker).
- **10-Band EQ** — Web Audio API powered equalizer that applies in real-time to both local and YTM audio.
- **Device-Aware Profiles** — Automatically switches EQ when you plug in different headphones or DACs.
- **Community Preset Store** — Browse, upvote, and publish EQ presets tagged by genre and device. Powered by Supabase.
- **Fully Themeable** — Dark / Light mode, pastel accent colors, and a custom secondary accent.

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
git clone https://github.com/umam1n/aura
cd aura
cp .env.example .env
# Edit .env and add your Supabase credentials
npm install
npm run dev
```

### Supabase Setup

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Paste and run the contents of `supabase_migration.sql`
4. Copy your project URL and `anon` key into `.env`

## Project Structure

```
src/
├── main/          # Electron main process
│   ├── ipc/       # IPC handlers (library, eq, devices, theme)
│   ├── db.ts      # SQLite database (better-sqlite3)
│   ├── ytm.ts     # YouTube Music BrowserView
│   └── adblocker.ts
├── preload/       # Context bridge preload scripts
├── renderer/src/
│   ├── audio/     # AudioEngine (Web Audio API EQ)
│   ├── components/
│   │   ├── Library/
│   │   ├── EQ/
│   │   ├── Presets/
│   │   └── Settings/
│   ├── lib/       # Supabase client + preset API
│   └── store/     # React context + AppProvider
└── shared/
    └── types.ts   # Shared TypeScript types
```

## Legal

This project is open-source under the **MIT License**.

YouTube Music integration is intended for **personal, non-commercial use only**, consistent with projects like [YouTube Music Desktop App](https://github.com/th-ch/youtube-music). Do not distribute this software commercially.

## Contributing

PRs are welcome! Please open an issue first for major changes.
