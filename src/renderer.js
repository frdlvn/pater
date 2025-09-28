const input = document.getElementById('message')
const statusEl = document.getElementById('status')
const toastEl = document.getElementById('toast')
// Debug helpers to verify preload API presence in dev
const api = window.pater
try { console.log('pater api keys:', Object.keys(api || {})) } catch {}

function setStatus (text) {
  statusEl.textContent = text
}

document.getElementById('btn-toast').addEventListener('click', async () => {
  const body = input.value || 'Hello from Electron'
  try {
    const res = await window.pater.showToast('Pater', body)
    if (!res?.ok) throw new Error(res?.error || 'Native notification failed')
    setStatus('Toast envoyée')
  } catch (err) {
    // Fallback UI toast for environments without native notifications (e.g., WSL2)
    showHtmlToast(body || 'Notification')
    setStatus(`Fallback toast affichée (${String(err)})`)
  }
})

document.getElementById('btn-agent').addEventListener('click', async () => {
  try {
    const res = await window.pater.runAgentOnce(input.value || '')
    if (!res?.ok) throw new Error(res?.error || 'Agent failed')
    setStatus('Agent: toast envoyée')
  } catch (err) {
    showHtmlToast('Agent ran (fallback toast)')
    setStatus(`Agent fallback toast (${String(err)})`)
  }
})

function showHtmlToast (text) {
  if (!toastEl) return
  toastEl.textContent = text
  toastEl.classList.add('show')
  clearTimeout(showHtmlToast._t)
  showHtmlToast._t = setTimeout(() => toastEl.classList.remove('show'), 2500)
}

// Window controls (frameless Linux)
const controls = document.querySelector('.win-controls')
if (controls) {
  controls.style.display = 'flex'
  document.getElementById('win-min')?.addEventListener('click', async () => {
    console.log('minimize click')
    await window.pater?.windowControls?.minimize?.()
  })
  document.getElementById('win-max')?.addEventListener('click', async () => {
    console.log('maximize click')
    await window.pater?.windowControls?.maximize?.()
  })
  document.getElementById('win-close')?.addEventListener('click', async () => {
    console.log('close click')
    await window.pater?.windowControls?.close?.()
  })
}


