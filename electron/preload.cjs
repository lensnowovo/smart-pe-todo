const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getApiKey: () => ipcRenderer.invoke('config:getApiKey'),
  setApiKey: (apiKey) => ipcRenderer.invoke('config:setApiKey', apiKey),
  clearApiKey: () => ipcRenderer.invoke('config:clearApiKey'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (config) => ipcRenderer.invoke('config:set', config),
  getStoreSync: (key) => ipcRenderer.sendSync('storage:getSync', key),
  setStoreSync: (key, data) => ipcRenderer.sendSync('storage:setSync', key, data),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  onUpdateStatus: (handler) => ipcRenderer.on('update:status', handler),
  offUpdateStatus: (handler) => ipcRenderer.removeListener('update:status', handler),
})
