import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import * as joint from 'jointjs'
import 'jointjs/dist/joint.css'

const Canvas = forwardRef(function Canvas({ onSelectionChanged, onReady }, ref) {
  const containerRef = useRef(null)
  const graphRef = useRef(null)
  const paperRef = useRef(null)
  const stateRef = useRef({ linkMode: null, fromElement: null, selected: null })

  useEffect(() => {
    let mounted = true
    const el = containerRef.current
    if (!el) return

    ;(async () => {
      // Carga dinámica del plugin UML asegurando window.joint
      try {
        window.joint = joint
        await import('jointjs/dist/joint.shapes.uml')
      } catch (e) {
        console.error('No se pudo cargar joint.shapes.uml:', e)
      }

      const graph = new joint.dia.Graph()
      graphRef.current = graph

      const w = el.clientWidth || 800
      const h = el.clientHeight || 600

      const paper = new joint.dia.Paper({
        el,
        model: graph,
        width: w,
        height: h,
        gridSize: 10,
        drawGrid: true,
        background: { color: '#f7f7fb' },
        interactive: true
      })
      paperRef.current = paper

      // Exponer para debug
      window.__graph = graphRef.current
      window.__paper = paperRef.current

      // ResizeObserver para mantener dimensiones correctas
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const cr = entry.contentRect
          paperRef.current?.setDimensions(
            Math.max(300, Math.floor(cr.width)),
            Math.max(300, Math.floor(cr.height))
          )
        }
      })
      ro.observe(el)

      // Selección y modo de enlace
      paper.on('element:pointerdown', (view) => {
        const st = stateRef.current
        const model = view.model

        if (st.linkMode) {
          if (!st.fromElement) {
            st.fromElement = model
            return
          }
          const from = st.fromElement
          const to = model
          if (from.id !== to.id) {
            const link = createLink(st.linkMode, from, to)
            if (link) graph.addCell(link)
          }
          st.linkMode = null
          st.fromElement = null
          return
        }

        // Selección normal
        st.selected = model
        onSelectionChanged?.({
          id: model.id,
          type: model.get('type'),
          name: model.get('name'),
          attributes: model.get('attributes') || []
        })
      })

// Selección de LINKS (para multiplicidades)
      paper.on('link:pointerdown', (linkView) => {
        const link = linkView.model
        stateRef.current.selected = link
        const labels = link.labels() || []
        const m0 = labels[0]?.attrs?.text?.text || '1'
        const m1 = labels[1]?.attrs?.text?.text || '0..*'
        onSelectionChanged?.({
          id: link.id,
          type: link.get('type'),
          isLink: true,
          multSource: m0,
          multTarget: m1
        })
      })

      console.log('UML.Class loaded?', !!joint.shapes.uml?.Class)
      onReady?.()



      // Cleanup
      return () => {
        if (!mounted) return
        ro.disconnect()
        paperRef.current?.remove()
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  useImperativeHandle(ref, () => ({
    clear() {
      graphRef.current?.clear()
      stateRef.current = { linkMode: null, fromElement: null, selected: null }
    },
    addClass() {
      console.log('addClass clicked')
      if (!graphRef.current) {
        console.warn('Graph no está listo aún.')
        return
      }
      const hasUML = !!joint.shapes.uml && !!joint.shapes.uml.Class
      let el
      if (hasUML) {
        const Class = joint.shapes.uml.Class
        el = new Class({
          position: { x: 80 + Math.random() * 200, y: 80 + Math.random() * 120 },
          size: { width: 220, height: 120 },
          name: 'NuevaClase',
          attributes: ['+ id: Long'],
          methods: []
        })
      } else {
        // Fallback visible si no están las shapes UML
        el = new joint.shapes.standard.Rectangle()
        el.resize(220, 120)
        el.position(80 + Math.random() * 200, 80 + Math.random() * 120)
        el.attr({
          label: { text: 'NuevaClase', fontWeight: '600' },
          body: { stroke: '#111', fill: '#fff' }
        })
        el.set('type', 'uml.Class')
        el.set('name', 'NuevaClase')
        el.set('attributes', ['+ id: Long'])
      }
      graphRef.current.addCell(el)
      console.log('Cells count:', graphRef.current.getCells().length)
    },
    setLinkMode(type) {
      stateRef.current.linkMode = type // assoc/agg/comp/gen
      stateRef.current.fromElement = null
    },
    addAttributeToSelected() {
      const el = stateRef.current.selected
      if (!el || el.get('type') !== 'uml.Class') return
      const current = el.get('attributes') || []
      const next = current.concat(['+ nuevo: String'])
      el.set('attributes', next)
    },
    renameSelected(name) {
      const el = stateRef.current.selected
      if (!el || el.get('type') !== 'uml.Class') return
      el.set('name', name)
    },
    getGraphJSON() {
      return graphRef.current.toJSON()
    },
    loadFromJSON(json) {
      graphRef.current.fromJSON(json)
    },
updateAttributeOfSelected(index, value) {
  const el = stateRef.current.selected
  if (!el || el.get('type') !== 'uml.Class') return
  const attrs = [...(el.get('attributes') || [])]
  attrs[index] = value
  el.set('attributes', attrs)
},
removeAttributeOfSelected(index) {
  const el = stateRef.current.selected
  if (!el || el.get('type') !== 'uml.Class') return
  const attrs = [...(el.get('attributes') || [])]
  attrs.splice(index, 1)
  el.set('attributes', attrs)
},
deleteSelected() {
  const el = stateRef.current.selected
  if (!el) return
  // borrar links conectados y luego el elemento
  const links = graphRef.current.getConnectedLinks(el) || []
  links.forEach(l => l.remove())
  el.remove()
  stateRef.current.selected = null
  // notificar al Inspector que ya no hay selección
  onSelectionChanged?.(null)
}
,
    getGraphJSON() {
      return graphRef.current.toJSON()
    },
    loadFromJSON(json) {
      graphRef.current.fromJSON(json)
    },
    // 🔧 Multiplicidades
    updateMultiplicity(index, value) {
      const link = stateRef.current.selected
      if (!link || !link.isLink()) return

      // Asegurar que existan 2 labels
      const labels = link.labels() || []
      if (!labels[0]) link.appendLabel({
        attrs: { text: { text: '1' }, rect: { fill: 'white' } },
        position: { distance: 35, offset: -10 }
      })
      if (!labels[1]) link.appendLabel({
        attrs: { text: { text: '0..*' }, rect: { fill: 'white' } },
        position: { distance: -35, offset: 10 }
      })

      // Actualizar el label requerido
      link.label(index, { attrs: { text: { text: value || '' }, rect: { fill: 'white' } } })

      // Notificar al inspector con los valores actualizados
      const ls = link.labels() || []
      const m0 = ls[0]?.attrs?.text?.text || ''
      const m1 = ls[1]?.attrs?.text?.text || ''
      onSelectionChanged?.({
        id: link.id,
        type: link.get('type'),
        isLink: true,
        multSource: m0,
        multTarget: m1
      })
    },
createManyToMany(fromId, toId) {
  const graph = graphRef.current
  if (!graph) return

  const a = graph.getCell(fromId)
  const b = graph.getCell(toId)
  if (!a || !b) return

  explodeManyToMany(new joint.shapes.uml.Association({
    source: { id: a.id },
    target: { id: b.id }
  }))
}

  }))

  return <div className="canvas" ref={containerRef} />
})

export default Canvas

// Helpers
function createLink(type, from, to) {
  const s = { id: from.id }
  const t = { id: to.id }
  switch (type) {
    case 'association':
      return new joint.shapes.uml.Association({ source: s, target: t })
    case 'aggregation':
      return new joint.shapes.uml.Aggregation({ source: s, target: t })
    case 'composition':
      return new joint.shapes.uml.Composition({ source: s, target: t })
    case 'generalization':
      return new joint.shapes.uml.Generalization({ source: s, target: t })
    default:
      return null
  }

     // Multiplicidades por defecto (source y target)
      link.appendLabel({
        attrs: { text: { text: '1' }, rect: { fill: 'white' } },
        position: { distance: 35, offset: -10 }
      })
      link.appendLabel({
        attrs: { text: { text: '0..*' }, rect: { fill: 'white' } },
        position: { distance: -35, offset: 10 }
      })

      return link
    }

    function isMany(text) {
      // considera * ó 0..* ó 1..* como "muchos"
      return typeof text === 'string' && text.includes('*')
    }

    // Crea asociación con multiplicidades (label 0 = origen/source, 1 = destino/target)
    function createAssociationWithMultiplicities(from, to, multSource, multTarget) {
      const link = new joint.shapes.uml.Association({
        source: { id: from.id },
        target: { id: to.id }
      })
      link.appendLabel({
        attrs: { text: { text: multSource }, rect: { fill: 'white' } },
        position: { distance: 35, offset: -10 }
      })
      link.appendLabel({
        attrs: { text: { text: multTarget }, rect: { fill: 'white' } },
        position: { distance: -35, offset: 10 }
      })
      return link
    }

    // Transforma una asociación N–N en clase intermedia (Join)
    function explodeManyToMany(link) {
      // Evitar repetir si ya fue explotado
      if (link.get('data')?.explodedToJoin) return

      const graph = link.graph
      const a = link.getSourceElement()
      const b = link.getTargetElement()
      if (!a || !b) return

      // Sólo tiene sentido en asociaciones/agre/compo (no en generalización)
      const type = link.get('type') || ''
      if (!/Association|Aggregation|Composition/.test(type)) return

      // Crear clase intermedia
      const nameA = a.get('name') || 'A'
      const nameB = b.get('name') || 'B'
      const joinName = `Join_${nameA}_${nameB}`

      const posA = a.position()
      const posB = b.position()
      const midX = Math.floor((posA.x + posB.x) / 2)
      const midY = Math.floor((posA.y + posB.y) / 2)

      const Class = joint.shapes.uml.Class
      const join = new Class({
        position: { x: midX - 100, y: midY - 60 },
        size: { width: 220, height: 120 },
        name: joinName,
        attributes: [
          '+ id: Long',
          `+ ${nameA}_id: Long`,
          `+ ${nameB}_id: Long`
        ],
        methods: []
      })

      // Crear nuevas relaciones: A (1) ↔ (*) Join y B (1) ↔ (*) Join
      const lAJ = createAssociationWithMultiplicities(a, join, '1', '*')
      const lBJ = createAssociationWithMultiplicities(b, join, '1', '*')

      graph.addCells([join, lAJ, lBJ])

      // Marcar el link original para no re-explotarlo y eliminarlo
      link.set('data', { ...(link.get('data') || {}), explodedToJoin: true })
      link.remove()

}
