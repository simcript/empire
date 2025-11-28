import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs, { existsSync, readdirSync } from 'fs'
import { nativeImage, app } from 'electron'

const execFileAsync = promisify(execFile)

const CACHE_FILE = path.join(app.getPath('userData'), 'installed_programs_cache.json')
const CACHE_TTL = 1000 * 60 * 1 // 1 دقیقه

/* -------------------- CONFIG: فیلترها -------------------- */
const FILTER_SYSTEM_PROGRAMS = true
const FILTER_MICROSOFT_RUNTIMES = true
const FILTER_WINDOWS_UPDATES = true
const FILTER_DRIVERS = true
const FILTER_SERVICES = true

const DEFAULT_ICON_PATH = path.join(__dirname, 'default-icon.png') // مسیر آیکون پیش‌فرض

/* -------------------- Registry Paths -------------------- */
const REGISTRY_PATHS = [
  'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
]

/* ----------------------------- Cache ----------------------------- */
function loadCache() {
  try {
    if (!existsSync(CACHE_FILE)) return null
    const content = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
    if (Date.now() - content.timestamp > CACHE_TTL) return null
    return content.data
  } catch {
    return null
  }
}

function saveCache(data) {
  try {
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify(
        {
          timestamp: Date.now(),
          data,
        },
        null,
        2
      )
    )
  } catch {}
}

/* --------------------- Registry Parser --------------------- */
function parseRegistryOutput(output) {
  const entries = []
  let current = null
  const lines = output.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (!line.startsWith(' ') && trimmed.startsWith('HKEY')) {
      if (current) entries.push(current)
      current = { registryKey: trimmed }
      continue
    }

    if (current) {
      const match = trimmed.match(/^([A-Za-z0-9_]+)\s+REG_\w+\s+(.*)$/)
      if (match) {
        const [, key, value] = match
        current[key] = value.trim()
      }
    }
  }

  if (current) entries.push(current)
  return entries
}

async function readRegistryTree(keyPath) {
  try {
    const { stdout } = await execFileAsync('reg', ['query', keyPath, '/s'])
    return parseRegistryOutput(stdout)
  } catch (e) {
    console.error('Registry read failed:', keyPath, e.message)
    return []
  }
}

/* -------------------------- Icon / Executable -------------------------- */
export function normalizeIconPath(value) {
  if (!value) return undefined
  let cleaned = value.trim()
  if (cleaned.startsWith('"')) {
    const closing = cleaned.indexOf('"', 1)
    if (closing > 0) cleaned = cleaned.slice(1, closing)
  }
  const comma = cleaned.indexOf(',')
  if (comma !== -1) cleaned = cleaned.slice(0, comma)
  // return encodeURI('file:///' + cleaned.trim().replaceAll(/\\/g, '/'));
  return cleaned.trim()
}

export function deriveExecutablePath(displayIcon, installLocation) {
  const iconPath = normalizeIconPath(displayIcon)

  if (iconPath && iconPath.endsWith('.exe') && existsSync(iconPath)) return iconPath

  if (installLocation && existsSync(installLocation)) {
    try {
      const files = readdirSync(installLocation, { withFileTypes: true })
      const exe = files
        .filter((x) => x.isFile() && x.name.toLowerCase().endsWith('.exe'))
        .map((x) => path.join(installLocation, x.name))
        .find((x) => existsSync(x))
      if (exe) return exe
    } catch {}
  }

  if (iconPath && iconPath.endsWith('.exe')) return iconPath
  return undefined
}

/* -------------------------- Icon Data URL -------------------------- */
function getIconDataUrl(displayIcon) {
  let pathToUse = normalizeIconPath(displayIcon)

  if (!pathToUse || !existsSync(pathToUse)) {
    pathToUse = DEFAULT_ICON_PATH
  }

  try {
    const image = nativeImage.createFromPath(pathToUse)
    if (!image.isEmpty()) return image.toDataURL()
  } catch (e) {
    console.error('Failed to load icon:', pathToUse, e.message)
  }

  // fallback به آیکون پیش‌فرض
  if (existsSync(DEFAULT_ICON_PATH)) {
    return nativeImage.createFromPath(DEFAULT_ICON_PATH).toDataURL()
  }

  return null
}

/* -------------------------- Main Function -------------------------- */
export async function listInstalledPrograms() {
  const cached = loadCache()
  if (cached) return cached

  const registryData = await Promise.all(REGISTRY_PATHS.map((path) => readRegistryTree(path)))

  const flattened = registryData.flat()
  const programs = []
  const seen = new Set()

  for (const entry of flattened) {
    const id = entry.registryKey
    if (seen.has(id)) continue
    seen.add(id)

    const name = entry.DisplayName?.trim()
    const installLocation = entry.InstallLocation?.trim()
    const publisher = entry.Publisher?.trim()
    const icon = entry.DisplayIcon

    // فیلتر اولیه: نام معتبر
    if (!name || name.length < 2) continue

    // فیلترهای پیشرفته
    const lname = name.toLowerCase()
    if (
      FILTER_SYSTEM_PROGRAMS &&
      (lname.includes('windows') ||
        lname.includes('security update') ||
        lname.includes('update for') ||
        lname.includes('hotfix'))
    )
      continue
    if (
      FILTER_MICROSOFT_RUNTIMES &&
      (lname.includes('microsoft visual c++') ||
        lname.includes('.net framework') ||
        lname.includes('microsoft redistributable'))
    )
      continue
    if (FILTER_WINDOWS_UPDATES && (lname.includes('windows update') || lname.includes('update')))
      continue
    if (
      FILTER_DRIVERS &&
      (lname.includes('driver') ||
        lname.includes('graphics driver') ||
        lname.includes('audio driver'))
    )
      continue
    if (
      FILTER_SERVICES &&
      (lname.includes('service pack') || lname.includes('background') || lname.includes('server'))
    )
      continue

    programs.push({
      id,
      name,
      installLocation,
      displayIcon: normalizeIconPath(icon),
      iconDataUrl: getIconDataUrl(icon), // اینجا آیکون به Data URL تبدیل شد
      publisher,
      estimatedSize: entry.EstimatedSize ? parseInt(entry.EstimatedSize, 10) : undefined,
    })
  }

  saveCache(programs)
  return programs
}
