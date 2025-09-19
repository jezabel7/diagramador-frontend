import React, { useRef, useState, useEffect } from 'react'
import NavBar from './components/NavBar'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import { downloadJSON } from './utils/download'
import { makeShareLink, decodeShared } from './utils/share'
import { buildModelSpecFromGraph } from './utils/modelSpec'
const API_BASE =
  (typeof import.meta !== 'undefined' &&
   import.meta.env &&
   import.meta.env.VITE_API_BASE) ||
  'http://localhost:8080';

export default function App() {
  const canvasRef = useRef(null)
  const [selectedMeta, setSelectedMeta] = useState(null)
  const [ready, setReady] = useState(false)
  const [genLoading, setGenLoading] = useState(false)

  useEffect(() => {
    if (!ready) return
    const shared = decodeShared()
    if (shared) {
      canvasRef.current?.loadFromJSON(shared)
    }
  }, [ready])

  // Handlers NavBar
  const handleNew = () => {
    canvasRef.current?.clear()
  }

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
    const link = makeShareLink(json)
    try {
      await navigator.clipboard.writeText(link)
      alert('Enlace copiado al portapapeles.')
    } catch (_) {
      prompt('Copia el enlace:', link)
    }
  }

  const downloadBlob = (blob, filename) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }
const handleGenerateCode = async () => {
  try {
    setGenLoading(true)

    // 1) Leer grafo del canvas
    const graphJSON = canvasRef.current?.getGraphJSON?.()
    if (!graphJSON || !graphJSON.cells?.length) {
      alert('No hay diagrama para generar.')
      return
    }

    // 2) Convertir a ModelSpec (lo que tu backend espera)
    const modelSpec = buildModelSpecFromGraph(graphJSON, {
      name: 'diagramador-generated',
      version: '0.0.1',
      packageBase: 'com.jezabel.healthgen',
    })

    // 3) Guardar spec y obtener id
    const resGen = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modelSpec),
    })
    if (!resGen.ok) throw new Error(await resGen.text())
    const { id } = await resGen.json()
    if (!id) throw new Error('El backend no devolvió un id.')

    // 4) Descargar ZIP generado
    const resZip = await fetch(`/api/codegen/${id}/zip`)
    if (!resZip.ok) throw new Error(await resZip.text())
    const blob = await resZip.blob()

    // 5) Descargar en el navegador
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


  // Handlers Sidebar
  const addClass = () => canvasRef.current?.addClass()
  const setRelation = type => canvasRef.current?.setLinkMode(type)
  const addAttribute = () => canvasRef.current?.addAttributeToSelected()
  const renameSelected = name => canvasRef.current?.renameSelected(name)
  const updateAttribute = (i, val) => canvasRef.current?.updateAttributeOfSelected(i, val)
  const removeAttribute = i => canvasRef.current?.removeAttributeOfSelected(i)
  const deleteSelected = () => canvasRef.current?.deleteSelected()
  const updateMultiplicity = (i, val) => canvasRef.current?.updateMultiplicity(i, val)

  // 👇 el return DEBE estar aquí dentro
  return (
    <div className="app-root">
      <NavBar
        onNew={handleNew}
        onImport={handleImport}
        onExport={handleExport}
        onShare={handleShare}
        onReadyDocs={() => alert('Generación de documentación: disponible al integrar backend.')}
        onGenerateCode={handleGenerateCode}   // 👈 handler
          genLoading={genLoading}               // 👈 loading
          genDisabled={!ready}
      />
      <div className="workspace">
        <Sidebar
          onAddClass={() => canvasRef.current?.addClass()}
          onSetRelation={t => canvasRef.current?.setLinkMode(t)}
          onAddAttribute={() => canvasRef.current?.addAttributeToSelected()}
          onRenameSelected={n => canvasRef.current?.renameSelected(n)}
          onUpdateAttribute={updateAttribute}
          onRemoveAttribute={removeAttribute}
          onDeleteSelected={deleteSelected}
          onUpdateMultiplicity={updateMultiplicity}
          selectedMeta={selectedMeta}
        />

        <Canvas
          ref={canvasRef}
          onSelectionChanged={setSelectedMeta}
          onReady={() => setReady(true)}
        />
      </div>
    </div>
  )
} // 👈 cierre de la función
