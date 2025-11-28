import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getGames: () => ipcRenderer.invoke('get-games'),
  refreshGames: () => ipcRenderer.invoke('refresh-games'),
  launchGame: (game) => ipcRenderer.invoke('launch-game', game),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  quitApp: () => ipcRenderer.send('quit-app'),
  getInstalledPrograms: () => ipcRenderer.invoke('get-installed-programs'),
  addExternalProgram: (program) => ipcRenderer.invoke('add-external-program', program),
  pickPortableExecutable: () => ipcRenderer.invoke('select-portable-executable'),
  addExternalExecutable: (filePath) => ipcRenderer.invoke('add-external-executable', filePath),
})
