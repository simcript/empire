import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import Store from 'electron-store';
import { listGames } from './services/game-scanner.js';
import { listInstalledPrograms, deriveExecutablePath } from './services/windows-programs.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import crypto from 'crypto';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const store = new Store({
  defaults: {
    favorites: [],
    lastSelectedLibraryFolders: [],
    scanOnStartup: true,
    controllerSensitivity: 0.5,
    externalGames: [],
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
let cachedExternalGames = store.get('externalGames', []);

/* -------------------- Installed Programs Cache -------------------- */
const programsStore = new Store({ name: 'installed-programs-cache', cwd: 'cache' });
const PROGRAMS_CACHE_KEY = 'programs';
const PROGRAMS_TTL = 1000 * 60 * 15; // 15 دقیقه

function loadProgramsCache() {
  const cache = programsStore.get(PROGRAMS_CACHE_KEY);
  if (!cache) return null;
  const expired = Date.now() - cache.timestamp > PROGRAMS_TTL;
  if (expired) return null;
  return cache.data;
}

function saveProgramsCache(data) {
  programsStore.set(PROGRAMS_CACHE_KEY, { timestamp: Date.now(), data });
}

/* -------------------- Game Cache Helpers -------------------- */
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
  if (currentScanPromise && !force) return currentScanPromise;

  currentScanPromise = (async () => {
    const games = await listGames();
    cachedGames = games;
    lastScanTimestamp = Date.now();

    const folders = deriveLibraryFolders(games);
    if (folders.length) store.set('lastSelectedLibraryFolders', folders);

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

  return [...cachedGames, ...cachedExternalGames];
}

/* -------------------- Electron Window -------------------- */
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

  if (isDev) mainWindow.webContents.openDevTools();

  const rendererDevServerURL =
    (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' &&
      MAIN_WINDOW_VITE_DEV_SERVER_URL) ||
    process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL ||
    (isDev ? 'http://localhost:5173' : undefined);

  if (isDev && rendererDevServerURL) mainWindow.loadURL(rendererDevServerURL);
  else mainWindow.loadFile(path.join(rendererDistPath, 'index.html'));

  mainWindow.on('closed', () => { mainWindow = null; });
}

/* -------------------- App Ready -------------------- */
app.whenReady().then(() => {
  if (store.get('scanOnStartup', true)) {
    refreshGameCache(true).catch((error) => {
      console.error('Startup scan failed:', error);
    });
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.on('quit-app', () => { app.quit(); });

/* -------------------- IPC Handlers -------------------- */
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
    const combined = [...games, ...cachedExternalGames];
    return { success: true, games: combined, lastScanTimestamp };
  } catch (error) {
    console.error('Error refreshing games:', error);
    return { success: false, error: error.message, games: [] };
  }
});

ipcMain.handle('launch-game', async (event, game) => {
  try {
    switch (game.platform) {
      case 'steam':
        if (!game.appId) throw new Error('Missing Steam appId');
        await shell.openExternal(`steam://run/${game.appId}`);
        break;
      case 'epic':
        if (!game.launchCommand) throw new Error('Missing Epic executable path');
        spawn(game.launchCommand, [], { detached: true, stdio: 'ignore', shell: true, cwd: game.installLocation ?? undefined }).unref();
        break;
      case 'gog':
        if (!game.launchCommand) throw new Error('Missing GOG launch command');
        spawn(game.launchCommand, [], { detached: true, stdio: 'ignore', shell: true, cwd: game.installLocation }).unref();
        break;
      default: throw new Error(`Unknown platform: ${game.platform}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Error launching game:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-settings', async () => store.store);
ipcMain.handle('set-setting', async (event, key, value) => {
  const allowedKeys = new Set(['favorites','scanOnStartup','controllerSensitivity']);
  if (!allowedKeys.has(key)) return { success: false, error: `Setting ${key} is not allowed` };
  if (key === 'favorites') store.set(key, Array.from(new Set(Array.isArray(value)?value:[])));
  else if (key === 'scanOnStartup') store.set(key, Boolean(value));
  else if (key === 'controllerSensitivity') {
    const num = Number(value);
    store.set(key, Number.isFinite(num)?Math.min(1,Math.max(0.1,num)):0.5);
  }
  return { success: true, settings: store.store };
});

/* -------------------- Installed Programs IPC -------------------- */
ipcMain.handle('get-installed-programs', async () => {
  try {
    const cached = loadProgramsCache();
    if (cached) return { success: true, programs: cached, cached: true };

    const programs = await listInstalledPrograms();
    saveProgramsCache(programs);

    return { success: true, programs, cached: false };
  } catch (error) {
    console.error('Failed to enumerate installed programs:', error);
    return { success: false, error: error.message, programs: [] };
  }
});

ipcMain.handle('refresh-installed-programs', async () => {
  try {
    const programs = await listInstalledPrograms();
    saveProgramsCache(programs);
    return { success: true, programs };
  } catch (error) {
    console.error('Failed to refresh installed programs:', error);
    return { success: false, error: error.message };
  }
});

/* -------------------- External Games -------------------- */
function loadExternalGames() {
  const games = store.get('externalGames', []);
  return Array.isArray(games) ? games : [];
}
function saveExternalGames(games) {
  cachedExternalGames = games;
  store.set('externalGames', games);
}
function buildExternalGameId(seed) { return `external_${crypto.createHash('sha1').update(seed).digest('hex')}`; }
function normalizeExternalPayload(data={}) { return { title: data.name?.trim() || data.title?.trim() || 'External Program', installLocation: data.installLocation || null, displayIcon: data.displayIcon || null, executablePath: data.executablePath || null }; }
function createExternalGameEntry(data) {
  const payload = normalizeExternalPayload(data);
  const executablePath = payload.executablePath || deriveExecutablePath(payload.displayIcon,payload.installLocation) || payload.installLocation;
  const idSeed = executablePath || payload.title + Date.now().toString();
  const id = buildExternalGameId(idSeed);

  return {
    id,
    title: payload.title,
    platform: 'external',
    installLocation: payload.installLocation || (executablePath?path.dirname(executablePath):null),
    executablePath: executablePath || null,
    coverPath: payload.displayIcon || null,
    launchCommand: executablePath || payload.installLocation || null,
  };
}
function upsertExternalGame(entry) {
  const games = loadExternalGames();
  const duplicateIndex = games.findIndex(game => {
    if (game.executablePath && entry.executablePath) return game.executablePath.toLowerCase()===entry.executablePath.toLowerCase();
    if (game.installLocation && entry.installLocation) return game.installLocation.toLowerCase()===entry.installLocation.toLowerCase();
    return false;
  });

  if (duplicateIndex>-1) { games[duplicateIndex] = {...games[duplicateIndex], ...entry}; saveExternalGames(games); return games[duplicateIndex]; }
  const updated = [...games, entry]; saveExternalGames(updated); return entry;
}

ipcMain.handle('add-external-program', async (event, program) => {
  try {
    // فقط فیلدهای ساده و clone-safe
    const safeProgram = {
      id: program.id,
      title: program.name,
      installLocation: program.installLocation,
      displayIcon: program.displayIcon,
      executablePath: program.installLocation || program.displayIcon || null,
      platform: 'external',
    };

    const saved = upsertExternalGame(safeProgram);
    return { success: true, game: saved };
  } catch (error) {
    console.error('Failed to add external program:', error);
    return { success: false, error: error.message };
  }
});


ipcMain.handle('select-portable-executable', async () => {
  const result = await dialog.showOpenDialog({ title:'Select Portable Application', filters:[{name:'Executable',extensions:['exe']}], properties:['openFile'] });
  if (result.canceled || !result.filePaths.length) return { canceled:true };
  return { canceled:false, filePath:result.filePaths[0] };
});

ipcMain.handle('add-external-executable', async (event,filePath)=>{
  try {
    if(!filePath || !filePath.toLowerCase().endsWith('.exe') || !existsSync(filePath)) throw new Error('Executable path is invalid.');
    const title = path.basename(filePath,path.extname(filePath));
    const installLocation = path.dirname(filePath);
    const entry = createExternalGameEntry({name:title,installLocation,executablePath:filePath,displayIcon:filePath});
    const saved = upsertExternalGame(entry);
    return { success:true, game:saved };
  } catch(error){ console.error('Failed to add portable executable:',error); return { success:false, error:error.message }; }
});
