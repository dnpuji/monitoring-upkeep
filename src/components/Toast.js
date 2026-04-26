import { state, subscribe } from '../lib/store.js'

export function initToast() {
  const container = document.createElement('div')
  container.className = 'toast-container'
  document.body.appendChild(container)

  subscribe(({ toast }) => {
    if (toast) {
      container.innerHTML = `<div class="toast ${toast.type || 'success'}">${toast.message}</div>`
    } else {
      container.innerHTML = ''
    }
  })
}
