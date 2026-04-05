const { app, BrowserWindow, globalShortcut } = require('electron')
const path = require('path')
const fs = require('fs')
const ipc = require('./ipc')

// 开发模式：彻底禁用 Chromium 磁盘缓存，确保 CSS/JS 每次都从磁盘重新读取
// 必须在 app ready 之前调用
if (!app.isPackaged) {
  app.commandLine.appendSwitch('disable-http-cache')
}

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#FFFFFF',
    icon: path.join(__dirname, '../assets/icon.icns'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))

  // 开发模式：直接从磁盘读 CSS 并注入，彻底绕过文件缓存
  if (!app.isPackaged) {
    mainWindow.webContents.on('did-finish-load', () => {
      const cssPath = path.join(__dirname, '../renderer/style.css')
      const css = fs.readFileSync(cssPath, 'utf8')
      mainWindow.webContents.insertCSS(css)
    })
  }

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
  // 开发模式下设置 Dock 图标（打包后由 .app bundle 自动处理）
  // dock.setIcon 需要 PNG，不支持 .icns
  if (!app.isPackaged && app.dock) {
    app.dock.setIcon(path.join(__dirname, '../assets/iconset/icon_512x512.png'))
  }

  ipc.registerHandlers()
  // 启动时打印数据目录，方便确认存储位置
  const store = require('./store')
  console.log('[AI Manager] 数据目录:', store.getDataDir())
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
