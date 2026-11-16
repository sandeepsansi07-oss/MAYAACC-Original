const { contextBridge, ipcRenderer } = require('electron');

// Exposed to MAYAACC as window.mayaDesktop.
// MAYAACC's own backup-folder code (mayaacc-bkfolder in index.html) uses
// chooseFolder / writeFile / list / remove — keep those names exactly.
// saveSnapshot / loadSnapshot are the extra PC-folder data safety net.
contextBridge.exposeInMainWorld('mayaDesktop', {
  isDesktop: true,
  platform: process.platform,
  chooseFolder: () => ipcRenderer.invoke('maya:choose-folder'),
  writeFile: (dir, name, text) => ipcRenderer.invoke('maya:write-file', dir, name, text),
  list: (dir) => ipcRenderer.invoke('maya:list', dir),
  remove: (dir, name) => ipcRenderer.invoke('maya:remove', dir, name),
  saveSnapshot: (data) => ipcRenderer.invoke('maya:save-snapshot', data),
  loadSnapshot: () => ipcRenderer.invoke('maya:load-snapshot'),
  getDataFolder: () => ipcRenderer.invoke('maya:get-data-folder'),
  openDataFolder: () => ipcRenderer.invoke('maya:open-data-folder'),
});
