import { app, BrowserWindow, ipcMain, shell } from 'electron';
import Store from 'electron-store';
import { listGames } from './services/game-scanner.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const store = new Store({
  defaults: {
    favorites: [],
    lastSelectedLibraryFolders: [],
    scanOnStartup: true,
    controllerSensitivity: 0.5,
  },
});
const appRoot = path.resolve(__dirname, '..', '..');
const rendererDistPath = path.join(appRoot, '.vite/renderer/main_window');
const preloadBundlePath = path.join(__dirname, 'preload.cjs');
const isDev = !app.isPackaged;

let mainWindow;
let cachedGames = [];
let lastScanTimestamp = null;
let currentScanPromise = null;

function deriveLibraryFolders(games) {
  const folders = new Set();
  games.forEach((game) => {
    if (game.installLocation) {
      folders.add(path.dirname(game.installLocation));
    }
  });
  return Array.from(folders);
}

async function refreshGameCache(force = false) {
  if (currentScanPromise && !force) {
    return currentScanPromise;
  }

  currentScanPromise = (async () => {
    const games = await listGames();
    cachedGames = games;
    lastScanTimestamp = Date.now();

    const folders = deriveLibraryFolders(games);
    if (folders.length) {
      store.set('lastSelectedLibraryFolders', folders);
    }

    return games;
  })();

  try {
    await currentScanPromise;
  } finally {
    currentScanPromise = null;
  }

  return cachedGames;
}

async function getGamesFromCache() {
  if (cachedGames.length === 0 && !currentScanPromise) {
    try {
      await refreshGameCache(true);
    } catch (error) {
      console.error('Initial game cache load failed:', error);
    }
  } else if (currentScanPromise) {
    await currentScanPromise;
  }

  return cachedGames;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: preloadBundlePath,
      nodeIntegration: false,
      contextIsolation: true,
    },
    frame: true,
    titleBarStyle: 'default',
    fullscreen: true,
    resizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    menuBarVisible: false,
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  const rendererDevServerURL =
    (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' &&
      MAIN_WINDOW_VITE_DEV_SERVER_URL) ||
    process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL ||
    (isDev ? 'http://localhost:5173' : undefined);

  if (isDev && rendererDevServerURL) {
    mainWindow.loadURL(rendererDevServerURL);
  } else {
    mainWindow.loadFile(path.join(rendererDistPath, 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  if (store.get('scanOnStartup', true)) {
    refreshGameCache(true).catch((error) => {
      console.error('Startup scan failed:', error);
    });
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('quit-app', () => {
  app.quit();
});

// IPC Handlers
ipcMain.handle('get-games', async () => {
  try {
    const games = await getGamesFromCache();
    return { success: true, games, lastScanTimestamp };
  } catch (error) {
    console.error('Error retrieving cached games:', error);
    return { success: false, error: error.message, games: [] };
  }
});

ipcMain.handle('refresh-games', async () => {
  try {
    const games = await refreshGameCache(true);
    return { success: true, games, lastScanTimestamp };
  } catch (error) {
    console.error('Error refreshing games:', error);
    return { success: false, error: error.message, games: [] };
  }
});

ipcMain.handle('launch-game', async (event, game) => {
  try {
    switch (game.platform) {
      case 'steam':
        if (!game.appId) {
          throw new Error('Missing Steam appId');
        }
        await shell.openExternal(`steam://run/${game.appId}`);
        break;

      case 'epic':
        if (!game.launchCommand) {
          throw new Error('Missing Epic executable path');
        }
        spawn(game.launchCommand, [], {
          detached: true,
          stdio: 'ignore',
          shell: true,
          cwd: game.installLocation ?? undefined,
        }).unref();
        break;

      case 'gog':
        if (!game.launchCommand) {
          throw new Error('Missing GOG launch command');
        }
        spawn(game.launchCommand, [], {
          detached: true,
          stdio: 'ignore',
          shell: true,
          cwd: game.installLocation,
        }).unref();
        break;

      default:
        throw new Error(`Unknown platform: ${game.platform}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error launching game:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-settings', async () => {
  return store.store;
});

ipcMain.handle('set-setting', async (event, key, value) => {
  const allowedKeys = new Set([
    'favorites',
    'scanOnStartup',
    'controllerSensitivity',
  ]);

  if (!allowedKeys.has(key)) {
    return { success: false, error: `Setting ${key} is not allowed` };
  }

  if (key === 'favorites') {
    const uniqueFavorites = Array.from(new Set(Array.isArray(value) ? value : []));
    store.set(key, uniqueFavorites);
  } else if (key === 'scanOnStartup') {
    store.set(key, Boolean(value));
  } else if (key === 'controllerSensitivity') {
    const numericValue = Number(value);
    const clamped = Number.isFinite(numericValue)
      ? Math.min(1, Math.max(0.1, numericValue))
      : 0.5;
    store.set(key, clamped);
  }

  return { success: true, settings: store.store };
});
