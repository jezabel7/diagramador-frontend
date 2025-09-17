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
}
