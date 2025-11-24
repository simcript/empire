import { existsSync, readdirSync, readFileSync } from 'fs';
import os from 'os';
import { join } from 'path';

const GOG_PATHS = [
  join(os.homedir(), 'AppData', 'Local', 'GOG.com', 'Galaxy', 'storage', 'galaxy-2.0.db'),
  join(os.homedir(), 'AppData', 'Local', 'GOG.com', 'Galaxy', 'storage', 'galaxy.db'),
];

async function tryBetterSqlite3(dbPath) {
  try {
    const { Database } = await import('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });
    
    const query = `
      SELECT 
        g.id,
        g.title,
        g.installDirectory,
        g.launchCommand,
        g.executable
      FROM InstalledBaseProducts g
      WHERE g.installDirectory IS NOT NULL
    `;
    
    const rows = db.prepare(query).all();
    db.close();
    return rows;
  } catch (error) {
    console.error('Error using better-sqlite3:', error);
    return null;
  }
}

export async function listGames() {
  const games = [];
  
  let dbPath = null;
  for (const path of GOG_PATHS) {
    if (existsSync(path)) {
      dbPath = path;
      break;
    }
  }
  
  if (!dbPath) {
    return games;
  }
  
  try {
    const rows = await tryBetterSqlite3(dbPath);
    
    if (!rows) {
      return games;
    }
    
    for (const row of rows) {
      if (row.installDirectory && existsSync(row.installDirectory)) {
        let executablePath = null;
        
        if (row.executable) {
          executablePath = join(row.installDirectory, row.executable);
        } else if (row.launchCommand) {
          executablePath = row.launchCommand;
        } else {
          try {
            const files = readdirSync(row.installDirectory);
            const exeFiles = files.filter(f => f.endsWith('.exe') && !f.includes('uninstall'));
            if (exeFiles.length > 0) {
              executablePath = join(row.installDirectory, exeFiles[0]);
            }
          } catch (error) {
            console.error(`Error finding executable for ${row.title}:`, error);
          }
        }
        
        if (executablePath) {
          games.push({
            id: `gog_${row.id}`,
            title: row.title || 'Unknown Game',
            platform: 'gog',
            appId: row.id,
            installLocation: row.installDirectory,
            launchCommand: row.launchCommand || executablePath,
            coverPath: null,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error scanning GOG games:', error);
  }
  
  return games;
}

