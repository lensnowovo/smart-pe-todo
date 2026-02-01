const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')

const CONFIG_FILE = 'pe-fund-ops.config.json'

const readConfig = () => {
  try {
    const configPath = path.join(app.getPath('userData'), CONFIG_FILE)
    if (!fs.existsSync(configPath)) return {}
    const raw = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

const writeConfig = (data) => {
  const configPath = path.join(app.getPath('userData'), CONFIG_FILE)
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8')
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 720,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  Menu.setApplicationMenu(null)

  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    win.loadURL(devServerUrl)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

const sendUpdateStatus = (payload) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('update:status', payload)
  })
}

app.whenReady().then(() => {
  ipcMain.handle('config:getApiKey', () => {
    const config = readConfig()
    return config.apiKey || ''
  })

  ipcMain.handle('config:setApiKey', (_event, apiKey) => {
    const config = readConfig()
    writeConfig({ ...config, apiKey: apiKey || '' })
    return true
  })

  ipcMain.handle('config:clearApiKey', () => {
    const config = readConfig()
    writeConfig({ ...config, apiKey: '' })
    return true
  })

  ipcMain.handle('config:get', () => {
    return readConfig()
  })

  ipcMain.handle('config:set', (_event, data) => {
    writeConfig(data || {})
    return true
  })

  ipcMain.handle('update:check', async () => {
    if (!app.isPackaged) {
      sendUpdateStatus({ state: 'disabled', message: '开发模式不支持更新' })
      return false
    }
    sendUpdateStatus({ state: 'checking' })
    return autoUpdater.checkForUpdates()
  })

  ipcMain.handle('update:download', async () => {
    if (!app.isPackaged) return false
    return autoUpdater.downloadUpdate()
  })

  ipcMain.handle('update:install', () => {
    if (!app.isPackaged) return false
    autoUpdater.quitAndInstall()
    return true
  })

  ipcMain.handle('app:getVersion', () => app.getVersion())

  createWindow()

  autoUpdater.autoDownload = false

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({ state: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({ state: 'available', info })
  })

  autoUpdater.on('update-not-available', (info) => {
    sendUpdateStatus({ state: 'none', info })
  })

  autoUpdater.on('error', (error) => {
    sendUpdateStatus({ state: 'error', message: error?.message || '更新失败' })
  })

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus({ state: 'downloading', progress })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({ state: 'downloaded', info })
  })

  if (app.isPackaged) {
    autoUpdater.checkForUpdates()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
