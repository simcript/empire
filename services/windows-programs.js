import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { existsSync, readdirSync } from 'fs';

const execFileAsync = promisify(execFile);

const REGISTRY_PATHS = [
  'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
];

function parseRegistryOutput(output, basePath) {
  const entries = [];
  const lines = output.split(/\r?\n/);
  let current = null;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    if (!line.startsWith(' ')) {
      if (current) {
        entries.push(current);
      }
      current = { registryKey: trimmed };
      return;
    }

    if (!current) {
      return;
    }

    const match = line.match(/^\s+([^\s]+)\s+REG_\w+\s+(.*)$/);
    if (match) {
      const [, key, value] = match;
      current[key] = value.trim();
    }
  });

  if (current) {
    entries.push(current);
  }

  return entries.filter((entry) => entry.registryKey?.startsWith(basePath));
}

async function readRegistryTree(keyPath) {
  try {
    const { stdout } = await execFileAsync('reg', ['query', keyPath, '/s']);
    return parseRegistryOutput(stdout, keyPath);
  } catch (error) {
    console.error(`Failed to read registry key ${keyPath}:`, error);
    return [];
  }
}

export function normalizeIconPath(value) {
  if (!value) return undefined;
  let cleaned = value.trim();
  if (!cleaned) return undefined;

  if (cleaned.startsWith('"')) {
    const closingQuote = cleaned.indexOf('"', 1);
    if (closingQuote > 0) {
      cleaned = cleaned.slice(1, closingQuote);
    }
  }

  const commaIndex = cleaned.indexOf(',');
  if (commaIndex > -1) {
    cleaned = cleaned.slice(0, commaIndex);
  }

  return cleaned.trim();
}

export function deriveExecutablePath(displayIcon, installLocation) {
  const iconPath = normalizeIconPath(displayIcon);
  if (iconPath && iconPath.toLowerCase().endsWith('.exe') && existsSync(iconPath)) {
    return iconPath;
  }

  if (installLocation && existsSync(installLocation)) {
    try {
      const entries = readdirSync(installLocation, { withFileTypes: true });
      const executable = entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.exe'))
        .map((entry) => path.join(installLocation, entry.name))
        .find((candidate) => existsSync(candidate));
      if (executable) {
        return executable;
      }
    } catch (error) {
      console.error('Failed to inspect install location for executable:', error);
    }
  }

  if (iconPath && iconPath.toLowerCase().endsWith('.exe')) {
    return iconPath;
  }

  return undefined;
}

export async function listInstalledPrograms() {
  const registryData = await Promise.all(REGISTRY_PATHS.map(readRegistryTree));
  const flattened = registryData.flat();
  const programs = [];
  const seen = new Set();

  flattened.forEach((entry) => {
    const name = entry.DisplayName?.trim();
    const installLocation = entry.InstallLocation?.trim();
    if (!name && !installLocation) {
      return;
    }

    const id = entry.registryKey;
    if (seen.has(id)) {
      return;
    }
    seen.add(id);

    programs.push({
      id,
      name: name || installLocation || 'Unknown Program',
      installLocation,
      displayIcon: normalizeIconPath(entry.DisplayIcon),
      publisher: entry.Publisher?.trim(),
      estimatedSize: entry.EstimatedSize ? Number.parseInt(entry.EstimatedSize, 10) : undefined,
    });
  });

  return programs;
}

