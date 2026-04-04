const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron')
const path = require('path')
const ipc = require('./ipc')

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f5f5f5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))

  // macOS 惯例：关闭窗口时隐藏，不退出
  mainWindow.on('close', (e) => {
    if (process.platform === 'darwin' && !app.isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })
}

function registerShortcuts() {
  // 全局快捷键：唤起窗口并聚焦 Inbox
  const shortcut = 'CommandOrControl+Shift+Space'
  const registered = globalShortcut.register(shortcut, () => {
    if (!mainWindow) return
    if (mainWindow.isVisible()) {
      mainWindow.webContents.send('app:focusInbox')
      mainWindow.focus()
    } else {
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('app:focusInbox')
    }
  })

  if (!registered) {
    console.warn(`快捷键 ${shortcut} 注册失败，可能被其他应用占用`)
  }
}

app.whenReady().then(() => {
  ipc.registerHandlers()
  createWindow()
  registerShortcuts()

  app.on('activate', () => {
    // macOS：点击 Dock 图标时恢复窗口
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show()
    }
  })
})

app.on('before-quit', () => {
  app.isQuitting = true
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// macOS：所有窗口关闭时不退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
