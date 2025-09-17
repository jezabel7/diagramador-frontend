import React, { useRef, useState, useEffect } from 'react'
import NavBar from './components/NavBar'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import { downloadJSON } from './utils/download'
import { makeShareLink, decodeShared } from './utils/share'

export default function App() {
  const canvasRef = useRef(null)
  const [selectedMeta, setSelectedMeta] = useState(null)
  const [ready, setReady] = useState(false)

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

  const handleImport = async (file) => {
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

  // Handlers Sidebar
  const addClass = () => canvasRef.current?.addClass()
  const setRelation = (type) => canvasRef.current?.setLinkMode(type)
  const addAttribute = () => canvasRef.current?.addAttributeToSelected()
  const renameSelected = (name) => canvasRef.current?.renameSelected(name)
    const updateAttribute = (i, val) => canvasRef.current?.updateAttributeOfSelected(i, val)
    const removeAttribute = (i)    => canvasRef.current?.removeAttributeOfSelected(i)
const deleteSelected = () => canvasRef.current?.deleteSelected()

  // 👇 el return DEBE estar aquí dentro
  return (
    <div className="app-root">
      <NavBar
        onNew={handleNew}
        onImport={handleImport}
        onExport={handleExport}
        onShare={handleShare}
        onReadyDocs={() =>
          alert('Generación de documentación: disponible al integrar backend.')
        }
      />
      <div className="workspace">
<Sidebar
  onAddClass={() => canvasRef.current?.addClass()}
  onSetRelation={(t) => canvasRef.current?.setLinkMode(t)}
  onAddAttribute={() => canvasRef.current?.addAttributeToSelected()}
  onRenameSelected={(n) => canvasRef.current?.renameSelected(n)}
  onUpdateAttribute={updateAttribute}
  onRemoveAttribute={removeAttribute}
  onDeleteSelected={deleteSelected}
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
