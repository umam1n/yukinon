# Yukinon UI/UX Architecture & Redesign Specification

A comprehensive technical audit and actionable architecture guide to transform Yukinon from an "AI-generated web template" into a focused, high-density, professional desktop and mobile audio workstation (in the vein of Swinsian, Plexamp, Apple Music, and foobar2000).

---

## 1. Executive Summary & Root Cause Diagnosis

### The Core Problem: Web-Marketing Aesthetics in a Desktop Tool
Yukinon suffers from a design mismatch: it is an audiophile local and streaming music player, but its visual language and component structure mimic a **generic SaaS marketing landing page or mobile web template**.

### Key "AI-Generated Template" Tells Identified
1. **Pervasive Glassmorphism and Blur:**
   - Overuse of `.glass`, `backdrop-filter: blur(24px)`, and `blur(80px)` across structural containers (`Sidebar.tsx:22`, `TitleBar.tsx:15`, `NowPlaying.tsx:55`). Real native desktop audio apps (Swinsian, foobar2000, Apple Music) use solid, opaque surfaces with 1px structural borders to ground content.
2. **Floating Pill Player Overlapping Content:**
   - Instead of a docked, grounded bottom control deck, NowPlaying floats with `bottom: 24px`, `borderRadius: 40px`, and huge drop shadows (`0 20px 40px rgba(0,0,0,0.2)`). This forces artificial padding hacks (`paddingBottom: 110px` on `<main>`), collisions with scrollbars, and obscured content.
3. **Magic Number Token Sprawl (429+ Inline Style Blocks):**
   - 12 different border radii: `2px`, `4px`, `6px`, `8px`, `10px`, `12px`, `16px`, `20px`, `24px`, `40px`, `100px`, `50%`.
   - 14 different font sizes: `9px`, `10px`, `11px`, `12px`, `13px`, `14px`, `15px`, `16px`, `17px`, `18px`, `20px`, `24px`, `32px`, `48px`.
   - Spacing values applied haphazardly (`7px 14px`, `2px`, `5px`, `6px`).
4. **Truncated Navigation Labels:**
   - `Sidebar.tsx:103` executes `item.label.split(' ')[0]` inside a 72px rail. This produces nonsensical, broken labels: `"YOUTH"` (YouTube Music), `"INTER"` (Internet Radio), `"NAVID"` (Navidrome), `"EQUAL"` (Equalizer).
5. **Marketing Copy & Decorative Emoji in Functional Views:**
   - `"Welcome to YUKINON ✨ / Your hybrid audiophile sanctuary"` in `App.tsx:60-61`.
   - `"Saved!"` and `"EQ Saved!"` with exclamation marks, `"🎵"` placeholder emojis.
6. **Zero Desktop Tool Ergonomics:**
   - Exactly **0 context menus (`onContextMenu`)**.
   - Exactly **0 accessibility attributes (`aria-label`, `role=`)**.
   - Exactly **0 focus rings (`:focus-visible`)**; hardcoded `outline: none` everywhere.
   - Exactly **0 in-app keyboard shortcuts** (no Space to play/pause, no Esc to dismiss, no Cmd/Ctrl+F to search).
   - Double-click required to play a track with no single-click selection or multi-select (`Shift`/`Cmd`).

---

## 2. Comprehensive Audit Breakdown

### Pillar 1: Visual Language & Design Tokens

| Element | Current State | Defect / AI Tell | Target Audio Tool Standard |
|---|---|---|---|
| **Border Radii** | 12 arbitrary values (up to `40px` and `100px`) | Pill-shaped cards and bubbly containers feel like mobile web mockups | Strict 3-tier scale: `0px` (window/panels), `4px` (buttons/inputs), `6px` (album art) |
| **Containers** | `.glass`, `backdrop-filter: blur(24px)` | Blurry backgrounds degrade performance and reduce legibility | Solid opaque panel surfaces (`--bg`, `--bg-2`, `--bg-card`) with crisp 1px borders |
| **Typography** | Default system font stack (`-apple-system`), 14 font sizes | Loose letter spacing, non-tabular track durations, no technical feel | **Geist / Inter** for UI; **JetBrains Mono** for track numbers, bitrates, sample rates, durations |
| **Density** | Track rows are 56px tall with 24px gaps; low information density | Air-filled marketing layout where only ~8 tracks fit in 800px | High-density 32px track rows; tabular lining; display codec, bitrate, frequency, year |
| **Gradients & Glow** | Neon accent gradients on progress bars and thumbs; glow filters | Overly decorative, visually fatiguing | Crisp solid 1-2px accent indicators with high contrast against dark surfaces |

---

### Pillar 2: Information Architecture & Navigation

#### The Problem: 10 Flat, Uncategorized Destinations
Currently, `Sidebar.tsx` treats streaming servers, local libraries, audio DSP tools, and playlists as equal peer icons in a single 72px strip.

```
CURRENT (FLAT 10-ITEM LIST):
[Library] [Playlists] [Queue] [YouTube Music] [Radio] [Subsonic] [Jellyfin] [EQ] [Presets] [Settings]
```

#### Proposed Semantic Hierarchy
Reorganize the sidebar into clear semantic groupings with icon + full label or expandable rail:

```
PROPOSED INFORMATION ARCHITECTURE:
├── 📁 LIBRARY
│   ├── Tracks (Table view with sortable columns)
│   ├── Albums (Grid view with cover art & release year)
│   └── Artists (Split column / list view)
├── 🌐 SOURCES
│   ├── Local Storage
│   ├── Jellyfin
│   ├── Subsonic / Navidrome
│   ├── Internet Radio
│   └── YouTube Music
├── 📑 PLAYLISTS
│   ├── [Custom User Playlists]
│   └── ➕ New Playlist (Inline modal creation)
└── 🎛️ SYSTEM & AUDIO
    ├── Equalizer & Device DSP
    ├── Sound Presets
    └── Settings
```

---

### Pillar 3: Interaction Design & Core Workflows

#### 1. Playback State Model: Shuffle & Repeat Bug
- **Current Bug:** In `AppProvider.tsx:40, 452-466`, `playbackMode` is a single enum: `'normal' | 'shuffle' | 'repeat-all' | 'repeat-one'`. Cycling modes means **a user cannot enable Shuffle and Repeat All simultaneously**.
- **Fix:** Decouple into two independent state variables:
  ```ts
  shuffle: boolean
  repeat: 'off' | 'all' | 'one'
  ```

#### 2. The Dangerous Unmute Audio Hazard
- **Current Bug:** In `NowPlaying.tsx:46` and `FullscreenPlayer.tsx:86`:
  ```ts
  if (newMuted) { setVolume(0) } else { setVolume(0.8) }
  ```
  If a user listening quietly at 10% volume mutes and unmutes, audio violently blasts at **80% volume**.
- **Fix:** Cache previous volume: `lastVolumeRef.current || 0.5`.

#### 3. Playback Queue Primitives
- **Current Defect:** `QueueView.tsx` is a 21-line bare wrapper that only passes `queue` to `TrackList`.
- **Missing Audio Workflows:**
  - "Play Next" action (insert track at `currentIndex + 1`).
  - "Add to Queue" action (append track to end of active queue).
  - Drag-and-drop or Up/Down reordering in the queue list.
  - "Clear Queue" button.
  - Visual distinction between **History**, **Now Playing**, and **Up Next**.

#### 4. Context Menus & Keyboard Ergonomics
- Implement native/custom desktop context menu (`onContextMenu`) on track rows, album cards, and playlists:
  - *Play*
  - *Play Next*
  - *Add to Queue*
  - *Add to Playlist >*
  - *Show in File Manager (Local)* / *Inspect Metadata*
- Register global Electron renderer hotkeys:
  - `Space`: Play / Pause (guarded against active input elements).
  - `ArrowLeft` / `ArrowRight`: Seek -5s / +5s (or with Shift: -15s / +15s).
  - `ArrowUp` / `ArrowDown`: Volume +/- 5%.
  - `CmdOrCtrl + F`: Jump to & focus global search filter.
  - `Esc`: Close fullscreen player or open modal.

---

### Pillar 4: Mobile / Android Architecture (`yukinon-android`)

#### 1. Hardware Back Button Handling
- In Android Capacitor, tapping the system back button immediately kills the app, even if the fullscreen player is expanded, a modal is open, or the user is deep in a playlist view.
- **Fix:** Install `@capacitor/app` and register an `appBackButton` listener maintaining a view navigation stack:
  `Modals/Sheets -> Fullscreen Player -> Previous View -> Exit`.

#### 2. Safe Area Insets & Edge-to-Edge
- `index.html` lacks `viewport-fit=cover`.
- `NowPlaying.tsx` and `Sidebar.tsx` use hardcoded pixel offsets (`bottom: 64px`, `height: 64px`) that collide with gesture pill bars and display cutouts.
- **Fix:** Add `viewport-fit=cover` and calculate layout offsets with `env(safe-area-inset-bottom, 0px)`.

#### 3. Bottom Navigation Ergonomics
- The mobile "Sidebar" currently renders **8 icon items** that horizontally scroll off-screen (`576px` wide on a 360dp viewport).
- **Fix:** Adopt Material 3 bottom navigation pattern with **4-5 primary destinations**:
  `[Library] [Playlists] [Explore / Sources] [Equalizer] [Settings]`
  Move the active Queue into a slide-over sheet inside the Now Playing player.

#### 4. Sub-48px Touch Targets
- Action icons (trash, add to playlist, mode toggles) measure 16-24px, causing frequent mis-taps.
- **Fix:** Enforce minimum 44x44px touch targets across all interactive rows and icon buttons.

---

## 3. The Target UI/UX Design System

### A. Color & Surface Hierarchy
```css
:root {
  /* Surfaces: Solid, grounded, high-contrast dark theme */
  --bg-app: #0c0d10;         /* Deep obsidian background */
  --bg-sidebar: #121317;     /* Docked navigation rail */
  --bg-card: #17181d;        /* Data containers & table headers */
  --bg-surface-hover: #1e2027;/* Hover state */
  --bg-surface-active: #262932;/* Selected row state */
  
  /* Borders: Sharp 1px structure instead of hazy box-shadows */
  --border-subtle: #23252d;
  --border-strong: #323541;

  /* Text: High legibility exceeding WCAG AAA standards */
  --text-primary: #f3f4f6;   /* 15.2:1 contrast ratio against --bg-app */
  --text-secondary: #9ca3af; /* 6.8:1 contrast ratio against --bg-app */
  --text-tertiary: #6b7280;  /* 4.5:1 contrast ratio against --bg-app */

  /* Accents: Crisp, restrained, functional indicator color */
  --accent-primary: #3b82f6; /* Classic functional audio blue */
  --accent-on-primary: #ffffff;
  --accent-subtle: rgba(59, 130, 246, 0.12);
}
```

### B. Standardized Spacing & Radius Tokens
```css
:root {
  /* Spacing Grid (4px scale) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* Border Radii: No pill bloat */
  --radius-none: 0px;        /* Sidebars, docked bottom bar, table */
  --radius-sm: 4px;          /* Inputs, action buttons, badges */
  --radius-md: 6px;          /* Cards, album artwork, modals */
  --radius-lg: 8px;          /* Window sheets */
}
```

### C. Typography Scale
```css
:root {
  --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Font Sizes */
  --text-xs: 11px;           /* Badges, bitrates, sample rates, column headers */
  --text-sm: 12px;           /* Standard table rows, artist names, descriptions */
  --text-base: 13px;         /* Track titles, sidebar labels, buttons */
  --text-lg: 16px;           /* Section headers, modal titles */
  --text-xl: 20px;           /* View titles (Library, Settings) */
}
```

---

## 4. Prioritized Implementation Roadmap

### Phase 1: High-Impact Usability & Bug Fixes (P0)
1. **Decouple Shuffle & Repeat:**
   - Split `playbackMode` into independent `shuffle: boolean` and `repeat: 'off' | 'all' | 'one'`.
   - Update `AppContext.ts`, `AppProvider.tsx`, `NowPlaying.tsx`, `FullscreenPlayer.tsx`.
2. **Fix Unmute Volume Shock:**
   - Cache non-zero volume prior to muting and restore upon unmute instead of forcing `0.8`.
3. **Global Keyboard Navigation:**
   - Add listeners for `Space` (play/pause), `ArrowLeft`/`ArrowRight` (seek), `Esc` (dismiss).
4. **Queue Essentials ("Play Next" & "Add to Queue"):**
   - Add `playNext(track)` and `addToQueue(track)` methods in orchestrator.
   - Expose actions on track rows in `TrackList.tsx`.
5. **Android Back Button & Safe Inset Fixes:**
   - Add `@capacitor/app` hardware back button stack and `viewport-fit=cover`.

### Phase 2: Visual De-slopping & Token Standardization (P1)
1. **Dock the Now Playing Deck:**
   - Transform `NowPlaying` from a floating `bottom: 24px, borderRadius: 40px` pill into a solid, docked bottom control panel (`height: 72px, bottom: 0, borderTop: 1px solid var(--border-subtle)`).
   - Remove artificial `paddingBottom: 110px` on `<main>`.
2. **Remove Web Template Tropes:**
   - Eliminate `backdrop-filter: blur(...)` from sidebar, titlebar, and main viewcards.
   - Replace rounded-2xl cards with structured panels with `4px` or `6px` radii.
   - Clean up marketing copy: replace `"Welcome to YUKINON ✨"` with functional library controls.
3. **Consolidate Styles into CSS Modules / Clean Tokens:**
   - Purge the 429 inline `style={{}}` declarations in favor of tokenized classes.

### Phase 3: Desktop Audio Workflows & High-Density Views (P2)
1. **Library Views (Tracks / Albums / Artists):**
   - Hook up dormant `groupMode` in `LibraryView.tsx` to provide an Album Art Grid and Artist Drill-down alongside the virtualized Track List.
2. **High-Density Table View:**
   - Reduce row height from 56px to 34px.
   - Add interactive sortable columns (`Title`, `Artist`, `Album`, `Year`, `Duration`, `Bitrate`).
   - Use `JetBrains Mono` for duration and metadata alignment.
3. **Desktop Context Menu:**
   - Add right-click context menu on track rows, playlists, and album cards.
4. **Settings Categorization:**
   - Split 560px linear scroll into tabbed subviews (`General`, `Audio Hardware & DSP`, `Sources & Media Servers`, `Appearance`, `Shortcuts`).
