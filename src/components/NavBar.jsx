import React, { useRef } from 'react'

export default function NavBar({ onNew, onImport, onExport, onShare, onReadyDocs }) {
  const fileRef = useRef(null)

  const onClickImport = () => fileRef.current?.click()
  const onFileChange = e => {
    const file = e.target.files?.[0]
    if (file) onImport(file)
    e.target.value = ''
  }

  return (
    <header className="navbar">
      <div className="brand">
        Diagramador <span className="tag"></span>
      </div>
      <div className="actions">
        <button onClick={onNew} title="Nuevo proyecto">
          Nuevo
        </button>
        <button onClick={onClickImport} title="Importar JSON">
          Importar
        </button>
        <button onClick={onExport} title="Exportar JSON">
          Exportar
        </button>
        <button onClick={onShare} title="Compartir enlace de snapshot">
          Compartir
        </button>
        <button onClick={onReadyDocs} title="Swagger/OpenAPI (placeholder)">
          Generar Doc
        </button>
        <input ref={fileRef} type="file" accept="application/json" onChange={onFileChange} hidden />
      </div>
    </header>
  )
}
