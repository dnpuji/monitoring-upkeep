import {
  state, loadMasterKegiatan, loadMasterBahan,
  addMasterKegiatan, deleteMasterKegiatan,
  addMasterBahan, deleteMasterBahan, showToast
} from '../lib/store.js'

function renderMasterList(container, items, onDelete) {
  if (items.length === 0) {
    container.innerHTML = `<div style="padding:16px; text-align:center; color:var(--neutral-400); font-size:13px;">Belum ada data. Tambahkan di atas.</div>`
    return
  }
  container.innerHTML = items.map(item => `
    <div class="master-item">
      <span class="master-item-name">${item.name}</span>
      <button class="btn btn-danger btn-xs" data-id="${item.id}">Hapus</button>
    </div>
  `).join('')

  container.querySelectorAll('[data-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Hapus "${btn.previousElementSibling.textContent}"?`)) return
      try {
        await onDelete(btn.dataset.id)
        showToast('Data dihapus.')
      } catch (e) { showToast('Gagal menghapus.', 'error') }
    })
  })
}

function setupMasterSection(container, type) {
  const isKegiatan = type === 'kegiatan'
  const label = isKegiatan ? 'Kegiatan' : 'Bahan'
  const inputId = `new-${type}`
  const listId = `list-${type}`

  const card = document.createElement('div')
  card.className = 'card'
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">Master ${label}</span>
    </div>
    <div class="card-body">
      <div style="display:flex; gap:8px; margin-bottom:14px;">
        <input class="form-control" type="text" id="${inputId}" placeholder="Nama ${label} baru" style="flex:1;">
        <button class="btn btn-primary" id="btn-add-${type}">Tambah</button>
      </div>
      <div id="${listId}" style="border:1px solid var(--neutral-200); border-radius:var(--radius-md); overflow:hidden; max-height:300px; overflow-y:auto;">
        <div style="padding:16px; text-align:center; color:var(--neutral-400); font-size:13px;">Memuat...</div>
      </div>
    </div>
  `
  container.appendChild(card)

  const input = card.querySelector(`#${inputId}`)
  const listEl = card.querySelector(`#${listId}`)

  const addFn = isKegiatan ? addMasterKegiatan : addMasterBahan
  const deleteFn = isKegiatan ? deleteMasterKegiatan : deleteMasterBahan
  const renderList = () => {
    const items = isKegiatan ? state.masterKegiatan : state.masterBahan
    renderMasterList(listEl, items, async (id) => {
      await deleteFn(id)
      renderList()
    })
  }

  card.querySelector(`#btn-add-${type}`).addEventListener('click', async () => {
    const val = input.value.trim()
    if (!val) return showToast('Nama tidak boleh kosong!', 'error')
    try {
      await addFn(val)
      input.value = ''
      showToast(`${label} "${val}" ditambahkan!`)
      renderList()
    } catch (e) {
      showToast(e.message?.includes('unique') ? 'Nama sudah ada!' : 'Gagal menambahkan.', 'error')
    }
  })

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') card.querySelector(`#btn-add-${type}`).click()
  })

  renderList()
}

export async function renderMasterView(container) {
  container.innerHTML = ''

  await Promise.all([loadMasterKegiatan(), loadMasterBahan()])

  setupMasterSection(container, 'kegiatan')
  setupMasterSection(container, 'bahan')

  const infoCard = document.createElement('div')
  infoCard.className = 'card'
  infoCard.innerHTML = `
    <div class="card-body" style="color:var(--neutral-500); font-size:12px; line-height:1.7;">
      <div style="font-weight:700; color:var(--neutral-700); margin-bottom:8px;">Tentang Master Data</div>
      <div>Master data adalah daftar pilihan yang muncul di dropdown saat mengisi Planning atau Hasil.</div>
      <div style="margin-top:6px;"><b>Kegiatan</b> = jenis pekerjaan (contoh: Semprot, Pupuk, Mowing)</div>
      <div><b>Bahan</b> = bahan/material yang digunakan (contoh: Roundup, Urea, DSP)</div>
    </div>
  `
  container.appendChild(infoCard)
}
