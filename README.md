# Empire 🎮

**Empire** — a Windows game and application launcher (Electron + Vue + Vite).
It allows scanning installed games and programs, adding them to the library, launching and managing them.

---

## ⚙️ Features

* Auto-scan Windows registry for installed programs ✅
* Add custom programs (external executables) to the library ✅
* List of games/programs with icons, install paths, and details ✅
* Launch games or apps (Steam / Epic / GOG / external) from the launcher ✅
* Supports Windows 64-bit and WOW6432Node registry ✅
* UI with Vue + Vite + Tailwind CSS ✅

---

## 🧑‍💻 Quick Start — Setup for Development

```bash
git clone https://github.com/simcript/empire.git
cd empire
npm install
npm run dev       # Development mode (Electron + Vite)
```

### Build (for end-users / Windows installer)

```bash
npm run make      # Output in `out/` folder
```

> ⚠️ If you see "Authors is required" or similar during `make`, make sure the `author` field in `package.json` is set.

---

## 🧪 Project Architecture

* `main.js` — Electron main process (window creation, IPC, launch, scan)
* `renderer/` — Vue + Vite frontend
* `services/windows-programs.js` — registry scan + program extraction
* `services/game-scanner.js` — scan library/game folders
* Config & store with `electron-store` for caching and settings

---

## 🚀 Usage

1. Run the launcher → Installed programs/games will appear
2. Go to "Programs" tab → Add programs to library with "Add to Library" button
3. Go to "Library / Games" tab → Launch games with "Play" button
4. Some external apps may need executable path adjustment

---

## 🧑‍🤝‍🧑 Contributing

Thanks for wanting to contribute 🙏

* Issues and Pull Requests are welcome
* Please lint/format your code before PR:

```bash
npm run lint:fix
```

* For major changes, discuss in Issues first to align

---

## 📄 License

This project is licensed under **MIT** — see the `LICENSE` file for details.

---

## 💡 Developer Notes

* ESLint + Prettier settings for consistent code in `renderer/`
* IPC structure between renderer and main for scan / launch / settings
* Windows support (path, registry, execution)
* Performance and error handling for stability
