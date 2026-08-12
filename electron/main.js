// electron/main.js - Electron 主进程
const { app, BrowserWindow, ipcMain } = require('electron')
const { spawn } = require('child_process')
const path = require('path')

let backendProcess = null
let mainWindow = null

const BACKEND_PORT = 8120
const FRONTEND_PORT = 5183

// 后端进程路径（开发环境用 Python 解释器，生产环境用打包的 binary）
function startBackend() {
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    // 开发环境：直接用 Python 启动
    const pythonExe = process.platform === 'win32' ? 'python' : 'python3'
    const backendPath = path.join(__dirname, '..', 'backend')
    backendProcess = spawn(pythonExe, [
      '-m', 'uvicorn',
      'app.main:app',
      '--host', '127.0.0.1',
      '--port', String(BACKEND_PORT),
    ], { cwd: backendPath, stdio: 'pipe' })

    backendProcess.stdout.on('data', (data) => {
      console.log(`[backend] ${data.toString()}`)
    })
    backendProcess.stderr.on('data', (data) => {
      console.error(`[backend:err] ${data.toString()}`)
    })
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: 'AI Music Workbench',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  const startUrl = app.isPackaged
    ? `file://${path.join(__dirname, '..', 'frontend', 'dist', 'index.html')}`
    : `http://localhost:${FRONTEND_PORT}`

  mainWindow.loadURL(startUrl)

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  startBackend()
  // 等待后端启动
  setTimeout(() => {
    createWindow()
  }, 3000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers
ipcMain.handle('app:get-version', () => app.getVersion())
ipcMain.handle('backend:get-port', () => BACKEND_PORT)