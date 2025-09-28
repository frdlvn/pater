const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('pater', {
  showToast: async (title, body) => {
    return ipcRenderer.invoke('toast:show', { title, body })
  },
  runAgentOnce: async (input) => {
    return ipcRenderer.invoke('agent:run-once', { input })
  },
  platform: process.platform,
  windowControls: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  }
})
