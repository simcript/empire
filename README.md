# Empire - Game Launcher

A modern Windows game launcher application built with Electron Forge and Vue 3 that automatically scans and displays games from Steam, Epic Games Store, and GOG Galaxy.

## Features

- **Multi-Platform Support**: Automatically detects games from:
  - Steam (via `libraryfolders.vdf`)
  - Epic Games (via manifest files)
  - GOG Galaxy (via database)
- **Beautiful UI**: Modern Vue 3 interface with TailwindCSS
- **Gamepad Support**: Navigate and launch games using a controller (D-pad/left stick, A launches, B backs out)
- **Favorites System**: Mark games as favorites for quick access
- **Auto-Generated Placeholders**: Missing cover art is automatically replaced with generated SVG placeholders

## Project Structure

```
empire/
├── main.js                 # Electron main process
├── preload.js              # Preload script for IPC
├── services/               # Game scanner services
│   ├── game-scanner.js     # Main scanner orchestrator
│   ├── steam-scanner.js    # Steam game detection
│   ├── epic-scanner.js     # Epic Games detection
│   └── gog-scanner.js      # GOG Galaxy detection
├── renderer/               # Vue.js frontend
│   ├── index.html
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── style.css
│       └── components/
│           ├── Sidebar.vue
│           ├── GameGrid.vue
│           ├── GameCard.vue
│           ├── FavoritesView.vue
│           ├── SettingsView.vue
│           └── ProgramsView.vue
├── services/
│   └── windows-programs.js   # Installed-program scan helper
└── assets/                 # Default assets
```

## Getting Started

1. Install dependencies
   ```bash
   npm install
   ```
2. Start the live-reloading Electron app (Electron Forge + Vite)
   ```bash
   npm run dev
   ```
3. Build distributables / installers
   ```bash
   npm run build    # electron-forge make
   npm run package  # optional unpackaged app bundle
   ```

## Testing & Checks

A lightweight smoke test validates the scanner contract:

```bash
npm test
```

## Game Launch Methods

- **Steam**: Uses `steam://run/<appId>` protocol
- **Epic Games**: Launches executable from manifest `InstallLocation`
- **GOG**: Executes `launchCommand` from database entry

## Controller Support

Connect an Xbox/DirectInput-compatible gamepad and use:
- **D-Pad / Left Stick**: Navigate through the grid (sensitivity is adjustable in Settings)
- **A Button**: Launch the highlighted game
- **B Button**: Return to the previous screen (e.g., from Favorites/Settings back to Library)

## All Programs Picker

- Use the **All Programs** sidebar section to scan Windows uninstall registries and list every installed desktop app.
- Filter instantly via the search bar, then click **Add to Library** to persist the app under the unified “external” platform (stored with `electron-store`).
- Add portable tools via **Add Portable App** → pick any `.exe`, and Mag will track it alongside other games.

## Refreshing Libraries & Settings

- Mag automatically refreshes Steam, Epic, and GOG libraries on startup (toggle in Settings).
- Trigger a manual scan from **Settings → Refresh Game Library Now**.
- Favorites, controller sensitivity, scan-on-startup, and the last detected library folders are persisted with `electron-store` at:
  - Windows: `%APPDATA%/Empire/config.json`
  - (Electron automatically resolves the correct per-OS userData directory.)

## Technologies

- **Electron**: Desktop application framework
- **Electron Forge**: Build and packaging tool
- **Vue 3**: Frontend framework (Composition API)
- **Vite**: Build tool for Vue
- **TailwindCSS**: Utility-first CSS framework
- **electron-store**: Persistent settings storage
- **better-sqlite3**: SQLite database access for GOG

## Requirements

- Windows 10/11
- Node.js 18+
- Steam, Epic Games Launcher, or GOG Galaxy installed (optional)

## License

MIT



