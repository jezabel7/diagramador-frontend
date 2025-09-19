const BASE = import.meta.env.VITE_API_URL

export async function requestZipFromModel(graphJson) {
  const res = await fetch(`${BASE}/codegen/zip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(graphJson),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Backend respondió ${res.status}: ${txt}`)
  }
  return await res.blob() // ZIP
}
