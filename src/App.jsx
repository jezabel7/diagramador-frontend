import React, { useRef, useState, useEffect, useMemo } from 'react'
import NavBar from './components/NavBar'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import { downloadJSON } from './utils/download'
import { buildModelSpecFromGraph } from './utils/modelSpec'
import { useGraphWs } from './ws/useGraphWs'

// Utilidades de compartir (vamos a inyectar docId en el link)
function encodeSnapshot(json) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(json))))
}
function decodeSnapshot(encoded) {
  try { return JSON.parse(decodeURIComponent(escape(atob(encoded)))) } catch { return null }
}

export default function App() {
  const canvasRef = useRef(null)
  const [selectedMeta, setSelectedMeta] = useState(null)
  const [ready, setReady] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [docLoading, setDocLoading] = useState(false)

  // docId: de la URL o generamos uno y lo fijamos en la URL
  const docId = useMemo(() => {
    const url = new URL(window.location.href)
    const existing = url.searchParams.get('doc')
    if (existing) return existing
    const d = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10)).slice(0, 8)
    url.searchParams.set('doc', d)
    window.history.replaceState({}, '', url)
    return d
  }, [])

  // Cargar snapshot si viene en el hash (#d=...)
  useEffect(() => {
    if (!ready) return
    const hash = window.location.hash
    if (hash.startsWith('#d=')) {
      const encoded = hash.slice(3)
      const shared = decodeSnapshot(encoded)
      if (shared) {
        canvasRef.current?.loadFromJSON(shared)
      }
    }
  }, [ready])

  // WS: aplicar patches remotos
  const handleRemotePatch = patch => {
    canvasRef.current?.applyPatch?.(patch)
  }
  const { sendPatch } = useGraphWs({ docId, onPatch: handleRemotePatch })

  const handleGenerateDocAi = async () => {
    try {
      setDocLoading(true)

      // Igual que codegen: construye el modelSpec desde el canvas
      const graphJSON = canvasRef.current?.getGraphJSON?.()
      if (!graphJSON?.cells?.length) { alert('No hay diagrama.'); return }

      const modelSpec = buildModelSpecFromGraph(graphJSON, {
        name: 'diagramador-generated',
        version: '0.0.1',
        packageBase: 'com.jezabel.healthgen',
      })

      // Guarda spec y obtén id
      const resGen = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(modelSpec),
      })
      if (!resGen.ok) throw new Error(await resGen.text())
      const { id } = await resGen.json()

      // Pide PDF IA
      const resPdf = await fetch('/api/ai/docs', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ id, filename: `${modelSpec.name}-doc.pdf` }),
      })
      if (!resPdf.ok) throw new Error(await resPdf.text())
      const blob = await resPdf.blob()

      // Descargar
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${modelSpec.name}-doc.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert('No se pudo generar el PDF IA.\n' + (e.message || e))
    } finally {
      setDocLoading(false)
    }
  }

  // NavBar handlers
  const handleNew = () => canvasRef.current?.clear()

  const handleImport = async file => {
    const text = await file.text()
    const json = JSON.parse(text)
    canvasRef.current?.loadFromJSON(json)
  }

  const handleExport = () => {
    const json = canvasRef.current?.getGraphJSON()
    downloadJSON('diagramador_model.json', json)
  }

  const handleShare = async () => {
    const json = canvasRef.current?.getGraphJSON()
    const encoded = encodeSnapshot(json)
    const base = `${window.location.origin}${window.location.pathname}?doc=${encodeURIComponent(docId)}`
    const link = `${base}#d=${encoded}`
    try {
      await navigator.clipboard.writeText(link)
      alert('Enlace copiado al portapapeles.')
    } catch {
      prompt('Copia el enlace:', link)
    }
  }

  // Codegen
  const handleGenerateCode = async () => {
    try {
      setGenLoading(true)
      const graphJSON = canvasRef.current?.getGraphJSON?.()
      if (!graphJSON || !graphJSON.cells?.length) {
        alert('No hay diagrama para generar.')
        return
      }
      const modelSpec = buildModelSpecFromGraph(graphJSON, {
        name: 'diagramador-generated',
        version: '0.0.1',
        packageBase: 'com.jezabel.healthgen',
      })
      const resGen = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modelSpec),
      })
      if (!resGen.ok) throw new Error(await resGen.text())
      const { id } = await resGen.json()
      if (!id) throw new Error('El backend no devolvió un id.')

      const resZip = await fetch(`/api/codegen/${id}/zip`)
      if (!resZip.ok) throw new Error(await resZip.text())
      const blob = await resZip.blob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `springboot_codegen_${id}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert(`No se pudo generar el código.\n${e.message || e}`)
    } finally {
      setGenLoading(false)
    }
  }

  // Sidebar handlers (con WS)
  const addClass = () => {
    const created = canvasRef.current?.addClass?.()
    if (created?.id) {
      sendPatch({ t: 'addClass', id: created.id, name: created.name, x: created.x, y: created.y })
    }
  }

  const renameSelected = name => {
    const id = selectedMeta?.id
    if (!id) return
    canvasRef.current?.renameSelected?.(name)
    sendPatch({ t: 'rename', id, name })
  }

  const addAttribute = () => {
    const id = selectedMeta?.id
    if (!id) return
    canvasRef.current?.addAttributeToSelected?.()
    sendPatch({ t: 'addAttr', id, value: '+ nuevo: String' })
  }

  const updateAttribute = (i, val) => {
    const id = selectedMeta?.id
    if (!id) return
    canvasRef.current?.updateAttributeOfSelected?.(i, val)
    sendPatch({ t: 'updAttr', id, index: i, value: val })
  }

  const removeAttribute = i => {
    const id = selectedMeta?.id
    if (!id) return
    canvasRef.current?.removeAttributeOfSelected?.(i)
    sendPatch({ t: 'delAttr', id, index: i })
  }

  const deleteSelected = () => {
    const id = selectedMeta?.id
    if (!id) return
    canvasRef.current?.deleteSelected?.()
    sendPatch({ t: 'delClass', id })
  }

  // Relaciones: activas modo desde Sidebar; el Canvas crea el link y emite patch 'addLink'
  const setRelation = type => canvasRef.current?.setLinkMode(type)

  // Multiplicidades: local + WS
  const updateMultiplicity = (i, val) => {
    const id = selectedMeta?.id
    if (!id) return
    // Canvas.updateMultiplicity ya emite setMult, pero lo mandamos desde App también si quieres centralizar:
    canvasRef.current?.updateMultiplicity?.(i, val)
    // Nota: Si no quieres doble emisión, quita este sendPatch. Lo dejo comentado:
    // sendPatch({ t: 'setMult', id, index: i, value: val })
  }

  return (
    <div className="app-root">
      <NavBar
        onNew={handleNew}
        onImport={handleImport}
        onExport={handleExport}
        onShare={handleShare}
        onGenerateDocAi={handleGenerateDocAi}
        docLoading={docLoading}
        docDisabled={!ready}
        onGenerateCode={handleGenerateCode}
        genLoading={genLoading}
        genDisabled={!ready}
      />
      <div className="workspace">
        <Sidebar
          onAddClass={addClass}
          onSetRelation={setRelation}
          onAddAttribute={addAttribute}
          onRenameSelected={renameSelected}
          onUpdateAttribute={updateAttribute}
          onRemoveAttribute={removeAttribute}
          onDeleteSelected={deleteSelected}
          onUpdateMultiplicity={updateMultiplicity}
          selectedMeta={selectedMeta}
        />
        <Canvas
          ref={canvasRef}
          onSelectionChanged={setSelectedMeta}
          onLocalPatch={sendPatch}   // 👈 Canvas emite move/addLink/setMult
          onReady={() => setReady(true)}
        />
      </div>
    </div>
  )
}
