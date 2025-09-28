import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('pater', {
  showToast: async (title, body) => {
    return ipcRenderer.invoke('toast:show', { title, body })
  },
  runAgentOnce: async (input) => {
    return ipcRenderer.invoke('agent:run-once', { input })
  }
})
