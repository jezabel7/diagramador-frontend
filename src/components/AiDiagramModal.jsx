import React from 'react'

export default function AiDiagramModal({ open, value, onChange, onCancel, onConfirm, loading }) {
  if (!open) return null
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Diagrama con IA</h3>
        <textarea
          rows={8}
          placeholder="Ej: genera diagrama para clínica con pacientes, doctores, citas..."
          value={value}
          onChange={e => onChange(e.target.value)}
        />
        <div className="actions">
          <button onClick={onCancel} disabled={loading}>Cancelar</button>
          <button onClick={onConfirm} disabled={loading || !value.trim()}>
            {loading ? 'Generando...' : 'Generar'}
          </button>
        </div>
      </div>
    </div>
  )
}
