export function formatTglIndo(isoDate) {
  if (!isoDate) return '-'
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

export function sumLuas(paddocks) {
  return (paddocks || []).reduce((a, p) => a + (parseFloat(p.luas) || 0), 0)
}

export function cleanSatuan(satuan) {
  return (satuan || '').replace(/\/Ha/gi, '').trim()
}

export function formatBahanLine(b) {
  if (typeof b !== 'object') return String(b)
  const sat = cleanSatuan(b.satuan)
  const total = parseFloat(b.total) || 0
  return `${b.name}: ${b.dosis} ${sat}/Ha (Tot: ${total.toFixed(2)} ${sat})`
}

export function buildWAText(type, tgl, reports) {
  let totalHK = 0
  let text = `*DAILY ${type.toUpperCase()}*\n📅 *Tanggal:* ${formatTglIndo(tgl)}\n--------------------------\n`
  reports.forEach((d, i) => {
    const luas = sumLuas(d.paddocks)
    totalHK += d.hk || 0
    text += `\n*${i + 1}. ${d.kegiatan.toUpperCase()} (${luas.toFixed(2)} Ha)*\n`
    text += `📍 Pdk: ${(d.paddocks || []).map(p => `${p.name} (${p.luas} Ha)`).join(', ')}\n`
    text += `👷 HK: ${d.hk} | 🚜 Alat: ${d.unit || '-'}\n`
    text += `⚙️ Stat: 🟢${d.jln} | 🔴${d.rsk} | 🟡${d.std}\n`
    const bahanLines = (d.bahans || []).map(formatBahanLine).join('\n   - ')
    text += `🧪 Bahan:\n   - ${bahanLines || '-'}\n`
    text += `ℹ️ Ket: ${d.ket || '-'}\n`
  })
  text += `\n--------------------------\n*TOTAL HK: ${totalHK} 👷*`
  return text
}

export function buildCSV(reports, tgl, type) {
  let csv = 'Tanggal,Tipe,Kegiatan,Paddock,Luas Total (Ha),HK,Unit,Ready,Breakdown,Standby,Bahan,Keterangan\n'
  reports.forEach(d => {
    const luas = sumLuas(d.paddocks)
    const pdk = (d.paddocks || []).map(p => `${p.name}(${p.luas}Ha)`).join(';')
    const bhn = (d.bahans || []).map(b => typeof b === 'object' ? `${b.name}(${b.total})` : b).join(';')
    csv += `"${d.tgl}","${d.type}","${d.kegiatan}","${pdk}","${luas.toFixed(2)}","${d.hk}","${d.unit || ''}","${d.jln}","${d.rsk}","${d.std}","${bhn}","${d.ket || ''}"\n`
  })
  return csv
}

export function downloadFile(content, filename, mimeType) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: mimeType }))
  a.download = filename
  a.click()
}

export async function syncToPipedream(tgl, reports, pipedreamURL) {
  const rows = []
  reports.forEach(d => {
    const listBahan = (d.bahans && d.bahans.length > 0) ? d.bahans : [{ name: '-', dosis: 0, satuan: '-', total: 0 }]
    const listPaddock = (d.paddocks && d.paddocks.length > 0) ? d.paddocks : [{ name: '-', luas: 0 }]
    listPaddock.forEach(pdk => {
      listBahan.forEach(b => {
        const satDasar = cleanSatuan(b.satuan)
        rows.push([
          d.id, d.tgl, d.type, d.kegiatan,
          pdk.name, pdk.luas, d.hk, d.unit || '',
          d.jln, d.rsk, d.std,
          b.name, b.dosis, satDasar + '/Ha', parseFloat(b.total) || 0, satDasar, d.ket || ''
        ])
      })
    })
  })
  const res = await fetch(pipedreamURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows })
  })
  if (!res.ok) throw new Error('Gagal respons dari server.')
  return rows.length
}
