import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import os from 'os';
import path, { join } from 'path';

const STEAM_PATHS = [
  join(os.homedir(), 'AppData', 'Local', 'Programs', 'Steam', 'steamapps'),
  join('C:', 'Program Files (x86)', 'Steam', 'steamapps'),
  join('C:', 'Program Files', 'Steam', 'steamapps'),
  join('D:', 'SteamLibrary', 'steamapps'),
  join('E:', 'SteamLibrary', 'steamapps'),
];

function parseVdf(content) {
  const lines = content.split('\n');
  const result = {};
  const stack = [result];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;
    
    const match = trimmed.match(/^"([^"]+)"\s+"?([^"]+)"?$/);
    if (match) {
      const [, key, value] = match;
      stack[stack.length - 1][key] = value;
      continue;
    }
    
    const openMatch = trimmed.match(/^"([^"]+)"\s*\{$/);
    if (openMatch) {
      const newObj = {};
      stack[stack.length - 1][openMatch[1]] = newObj;
      stack.push(newObj);
      continue;
    }
    
    if (trimmed === '}') {
      stack.pop();
    }
  }
  
  return result;
}

async function findLibraryFolders() {
  const paths = [];
  
  for (const steamPath of STEAM_PATHS) {
    if (existsSync(steamPath)) {
      paths.push(steamPath);
      
      const libraryFoldersPath = join(steamPath, 'libraryfolders.vdf');
      if (existsSync(libraryFoldersPath)) {
        try {
          const content = await readFile(libraryFoldersPath, 'utf-8');
          const parsed = parseVdf(content);
          
          if (parsed.LibraryFolders) {
            for (const key in parsed.LibraryFolders) {
              if (key !== 'TimeNextStatsReport' && key !== 'ContentStatsID') {
                const folderPath = parsed.LibraryFolders[key];
                if (typeof folderPath === 'string' && existsSync(folderPath)) {
                  const libraryPath = join(folderPath, 'steamapps');
                  if (existsSync(libraryPath)) {
                    paths.push(libraryPath);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Error parsing libraryfolders.vdf:', error);
        }
      }
    }
  }
  
  return [...new Set(paths)];
}

async function parseAcfFile(acfPath) {
  try {
    const content = await readFile(acfPath, 'utf-8');
    const parsed = parseVdf(content);
    
    if (parsed.AppState) {
      const appId = parsed.AppState.appid;
      const name = parsed.AppState.name;
      const installDir = parsed.AppState.installdir;
      
      if (appId && name) {
        const libraryPath = path.dirname(acfPath);
        const installFolder = installDir || name;
        const installLocation = join(libraryPath, 'common', installFolder);

        return {
          id: `steam_${appId}`,
          title: name,
          platform: 'steam',
          appId,
          installLocation,
          coverPath: null,
          launchCommand: `steam://run/${appId}`,
        };
      }
    }
  } catch (error) {
    console.error(`Error parsing ACF file ${acfPath}:`, error);
  }
  
  return null;
}

export async function listGames() {
  const games = [];
  const libraryPaths = await findLibraryFolders();
  
  for (const libraryPath of libraryPaths) {
    try {
      const files = await readdir(libraryPath);
      const acfFiles = files.filter(f => f.endsWith('.acf'));
      
      for (const acfFile of acfFiles) {
        const acfPath = join(libraryPath, acfFile);
        const game = await parseAcfFile(acfPath);
        if (game) {
          games.push(game);
        }
      }
    } catch (error) {
      console.error(`Error scanning library ${libraryPath}:`, error);
    }
  }
  
  return games;
}



