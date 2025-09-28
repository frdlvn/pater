const input = document.getElementById('message')
const statusEl = document.getElementById('status')

function setStatus (text) {
  statusEl.textContent = text
}

document.getElementById('btn-toast').addEventListener('click', async () => {
  const body = input.value || 'Hello from Electron'
  const res = await window.pater.showToast('Pater', body)
  setStatus(res.ok ? 'Toast envoyée' : `Erreur: ${res.error}`)
})

document.getElementById('btn-agent').addEventListener('click', async () => {
  const res = await window.pater.runAgentOnce(input.value || '')
  setStatus(res.ok ? 'Agent: toast envoyée' : `Agent erreur: ${res.error}`)
})


