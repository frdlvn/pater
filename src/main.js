import { app, BrowserWindow, ipcMain, Notification, Tray, Menu } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildAgentGraph } from './agent.js'
import Store from 'electron-store'
import cron from 'node-cron'
import { isInQuietHours, hhmmToMinutes, isRateLimited, isDeduped, recordNotification } from './rules.js'

// Toast notifications via Electron Notification API (cross-platform)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const APP_ID = 'com.pater.app'
let tray
let mainWindow
const store = new Store({
  defaults: {
    quiet: { from: '22:00', to: '08:00' },
    rate: { maxPer2h: 3 },
    lastNotifs: []
  }
})

function createWindow () {
  const isWin = process.platform === 'win32'
  const isMac = process.platform === 'darwin'
  const isLinux = process.platform === 'linux'
  const win = new BrowserWindow({
    width: 900,
    height: 650,
    backgroundColor: '#0b1020',
    autoHideMenuBar: true,
    titleBarStyle: isWin ? 'hidden' : (isMac ? 'hiddenInset' : 'hidden'),
    titleBarOverlay: isWin ? { color: '#0b1020', symbolColor: '#e6e9f5', height: 44 } : undefined,
    frame: isLinux ? false : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow = win

  const isDev = process.env.ELECTRON_DEV === 'true' || process.env.NODE_ENV === 'development'
  if (isDev) {
    win.loadURL('http://127.0.0.1:5173')
  } else {
    const indexPath = path.join(__dirname, 'index.html')
    win.loadFile(indexPath)
  }
}

app.setAppUserModelId(APP_ID)

app.whenReady().then(() => {
  createWindow()
  try {
    tray = new Tray(path.join(__dirname, 'icon.png'))
    tray.setToolTip('Pater — active')
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Test notification', click: () => showDailyCheck() },
      { type: 'separator' },
      { label: 'Quit', role: 'quit' }
    ]))
  } catch {}

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
  cron.schedule('*/15 * * * *', () => showDailyCheck())
  setTimeout(() => showDailyCheck(), 5000)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function showToast (title, body) {
  try {
    if (!Notification.isSupported()) {
      return { ok: false, error: 'Notifications not supported on this platform' }
    }

    const notification = new Notification({
      title: title ?? 'Pater',
      body: body ?? 'Notification'
    })

    notification.show()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

function nowMinutes () {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function shouldNotifyNow () {
  const currentMins = nowMinutes()
  const fromMins = hhmmToMinutes(store.get('quiet.from'))
  const toMins = hhmmToMinutes(store.get('quiet.to'))
  if (isInQuietHours(currentMins, fromMins, toMins)) return false

  const now = Date.now()
  const history = store.get('lastNotifs')
  const windowMs = 2 * 60 * 60 * 1000
  const maxPerWindow = store.get('rate.maxPer2h')
  if (isRateLimited(now, history, windowMs, maxPerWindow)) return false

  return true
}

function buildPayload () {
  return {
    id: `n-${Date.now()}`,
    dedupeKey: 'checkin',
    title: 'Pater Agent',
    body: 'As-tu 5 min pour un check-in ?'
  }
}

function showDailyCheck () {
  if (!shouldNotifyNow()) return
  const payload = buildPayload()
  if (isDeduped(Date.now(), store.get('lastNotifs'), payload.dedupeKey, 30 * 60 * 1000)) return
  const r = showToast(payload.title, payload.body)
  if (r.ok) {
    const nextHist = recordNotification(store.get('lastNotifs'), payload.id, payload.dedupeKey, Date.now(), 50)
    store.set('lastNotifs', nextHist)
  }
}

ipcMain.handle('toast:show', async (_event, payload) => {
  const title = payload?.title ?? 'Pater Agent'
  const body = payload?.body ?? 'Hello from agent'
  return showToast(title, body)
})

ipcMain.handle('agent:run-once', async (_event, payload) => {
  try {
    const graph = buildAgentGraph()
    const result = await graph.invoke({ input: payload?.input ?? '' })
    const title = result?.title ?? 'Pater Agent'
    const body = result?.body ?? 'Hello from LangGraph'
    const r = showToast(title, body)
    return r.ok ? { ok: true } : { ok: false, error: r.error }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

ipcMain.handle('window:minimize', () => {
  const win = BrowserWindow.getFocusedWindow() ?? mainWindow
  if (win) win.minimize()
  return true
})

ipcMain.handle('window:maximize', () => {
  const win = BrowserWindow.getFocusedWindow() ?? mainWindow
  if (!win) return false
  if (win.isMaximized()) win.unmaximize()
  else win.maximize()
  return win.isMaximized()
})

ipcMain.handle('window:close', () => {
  const win = BrowserWindow.getFocusedWindow() ?? mainWindow
  if (win) win.close()
  return true
})


