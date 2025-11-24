import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import os from 'os';

const EPIC_MANIFEST_PATHS = [
  join(os.homedir(), 'AppData', 'Local', 'EpicGamesLauncher', 'Saved', 'Manifests'),
  join(os.homedir(), 'AppData', 'Local', 'Epic Games', 'Launcher', 'Saved', 'Manifests'),
];

function parseItemFile(content) {
  try {
    const json = JSON.parse(content);
    return json;
  } catch (error) {
    console.error('Error parsing Epic item file:', error);
    return null;
  }
}

export async function listGames() {
  const games = [];
  
  let manifestPath = null;
  for (const path of EPIC_MANIFEST_PATHS) {
    if (existsSync(path)) {
      manifestPath = path;
      break;
    }
  }
  
  if (!manifestPath) {
    return games;
  }
  
  try {
    const files = await readdir(manifestPath);
    const itemFiles = files.filter(f => f.endsWith('.item'));
    
    for (const itemFile of itemFiles) {
      try {
        const itemPath = join(manifestPath, itemFile);
        const content = await readFile(itemPath, 'utf-8');
        const manifest = parseItemFile(content);
        
        if (manifest && manifest.CatalogItemId && manifest.DisplayName) {
          const installLocation = manifest.InstallLocation;
          
          if (installLocation && existsSync(installLocation)) {
            let executablePath = null;
            
            if (manifest.LaunchExecutable) {
              executablePath = join(installLocation, manifest.LaunchExecutable);
            } else {
              try {
                const files = await readdir(installLocation);
                const exeFiles = files.filter(f => f.endsWith('.exe') && !f.includes('Unreal'));
                if (exeFiles.length > 0) {
                  executablePath = join(installLocation, exeFiles[0]);
                }
              } catch (error) {
                console.error(`Error finding executable for ${manifest.DisplayName}:`, error);
              }
            }
            
            if (executablePath) {
              games.push({
                id: `epic_${manifest.CatalogItemId}`,
                title: manifest.DisplayName,
                platform: 'epic',
                appId: manifest.CatalogItemId,
                installLocation,
                coverPath: null,
                launchCommand: executablePath,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error processing Epic item file ${itemFile}:`, error);
      }
    }
  } catch (error) {
    console.error('Error scanning Epic games:', error);
  }
  
  return games;
}

