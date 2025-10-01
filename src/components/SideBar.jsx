import React, { useState, useEffect } from 'react'

export default function Sidebar({
  onAddClass,
  onSetRelation,
  onAddAttribute,
  onRenameSelected,
  onUpdateAttribute,
  onRemoveAttribute,
  onDeleteSelected,
  onUpdateMultiplicity,
  selectedMeta,
}) {
  const [name, setName] = useState('')
  const [attrs, setAttrs] = useState([])
  const [m0, setM0] = useState('1')
  const [m1, setM1] = useState('0..*')

  useEffect(() => {
    if (!selectedMeta) return

    if (selectedMeta.isLink) {
      // ya lo tienes en otro useEffect; puedes fusionarlo si quieres
      setM0(selectedMeta.multSource ?? '1')
      setM1(selectedMeta.multTarget ?? '0..*')
    } else {
      // 👇 sincroniza nombre + atributos cuando seleccionas una clase
      setName(selectedMeta.name || '')
      setAttrs(selectedMeta.attributes || [])
    }
  }, [selectedMeta])

  const disabled = !selectedMeta || selectedMeta.type !== 'uml.Class'

  return (
    <aside className="sidebar">
      <div className="section">
        <h3>Elementos</h3>
        <button onClick={onAddClass}>+ Clase</button>
      </div>
      <div style={{ marginTop: -10 }}>
        <button onClick={onDeleteSelected} disabled={disabled}>
          Eliminar clase
        </button>
      </div>

      <div className="section">
        <h3>Relaciones</h3>
        <div className="relation-grid">
          <button onClick={() => onSetRelation('association')}>Asociación</button>
          <button onClick={() => onSetRelation('aggregation')}>Agregación</button>
          <button onClick={() => onSetRelation('composition')}>Composición</button>
          <button onClick={() => onSetRelation('generalization')}>Generalización</button>
        </div>
        <small>Selecciona tipo y luego clic en origen → destino</small>
      </div>

      <div className="section">
        <h3>Inspector</h3>
        <label>Nombre de clase</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={() => name && onRenameSelected(name)}
          placeholder="NombreClase"
          disabled={disabled}
        />
        <div style={{ marginTop: 8 }}>
          <button onClick={onAddAttribute} disabled={disabled}>
            + Atributo
          </button>
        </div>

        {/* Lista de atributos */}
        {!disabled && attrs?.length > 0 && (
          <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
            {attrs.map((a, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6 }}>
                <input
                  type="text"
                  value={a}
                  onChange={e => {
                    const val = e.target.value
                    const next = [...attrs]
                    next[i] = val
                    setAttrs(next)
                  }}
                  onBlur={e => onUpdateAttribute(i, e.target.value)}
                  placeholder="+ campo: Tipo"
                />
                <button onClick={() => onRemoveAttribute(i)} title="Eliminar atributo">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Inspector de relación */}
        {/* Inspector de relación */}
        {selectedMeta?.isLink && selectedMeta?.type === 'uml.Association' && (
          <div className="section" style={{ marginTop: 16 }}>
            <h3>Relación seleccionada</h3>
            <label>Multiplicidad (origen)</label>
            <input
              type="text"
              value={m0}
              onChange={e => setM0(e.target.value)}
              onBlur={e => onUpdateMultiplicity?.(0, e.target.value)}
              placeholder="1 | 0..1 | * | 0..* | 1..*"
            />
            <label style={{ marginTop: 8 }}>Multiplicidad (destino)</label>
            <input
              type="text"
              value={m1}
              onChange={e => setM1(e.target.value)}
              onBlur={e => onUpdateMultiplicity?.(1, e.target.value)}
              placeholder="1 | 0..1 | * | 0..* | 1..*"
            />
            <small>Consejo: multiplicidades solo para asociaciones.</small>
          </div>
        )}

        {disabled && <small>Selecciona una clase para editar.</small>}
      </div>
    </aside>
  )
}
