import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildAgentGraph } from './agent.js'

// Windows toast notifications
// This module no-ops on non-Windows platforms
// eslint-disable-next-line n/no-missing-require
import WindowsNotifications from 'electron-windows-notifications'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const APP_ID = 'com.pater.app'

function createWindow () {
  const win = new BrowserWindow({
    width: 900,
    height: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const indexPath = path.join(__dirname, 'renderer.html')
  win.loadFile(indexPath)
}

app.setAppUserModelId(APP_ID)

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function showToast (title, body) {
  try {
    const { ToastNotification } = WindowsNotifications
    const template = '<toast><visual><binding template="ToastText02">' +
      '<text id="1">%s</text><text id="2">%s</text>' +
      '</binding></visual></toast>'

    const toast = new ToastNotification({
      appId: APP_ID,
      template,
      strings: [title ?? 'Pater', body ?? 'Notification']
    })

    toast.on('activated', () => {
      // noop
    })

    toast.show()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
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


