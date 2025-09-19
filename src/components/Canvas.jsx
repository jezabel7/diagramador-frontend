import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import * as joint from 'jointjs'
import 'jointjs/dist/joint.css'

/**
 * Props:
 * - onSelectionChanged(meta|null)
 * - onLocalPatch(patch)   // para emitir patches locales: move, addLink, setMult
 * - onReady()
 */
const Canvas = forwardRef(function Canvas({ onSelectionChanged, onLocalPatch, onReady }, ref) {
  const containerRef = useRef(null)
  const graphRef = useRef(null)
  const paperRef = useRef(null)
  const stateRef = useRef({ linkMode: null, fromElement: null, selected: null, mute: false })

  // callbacks por ref (evita re-montajes)
  const cbRef = useRef({ onLocalPatch, onSelectionChanged })
  useEffect(() => { cbRef.current.onLocalPatch = onLocalPatch }, [onLocalPatch])
  useEffect(() => { cbRef.current.onSelectionChanged = onSelectionChanged }, [onSelectionChanged])

  useEffect(() => {
    let mounted = true
    const el = containerRef.current
    if (!el) return
    ;(async () => {
      // Carga plugin UML
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
        interactive: true,
      })
      paperRef.current = paper

      // debug globals
      window.__graph = graphRef.current
      window.__paper = paperRef.current

      // Responsive
      const ro = new ResizeObserver(entries => {
        for (const entry of entries) {
          const cr = entry.contentRect
          paperRef.current?.setDimensions(
            Math.max(300, Math.floor(cr.width)),
            Math.max(300, Math.floor(cr.height))
          )
        }
      })
      ro.observe(el)

      // Click en elemento (selección / creación de relación)
      paper.on('element:pointerdown', view => {
        const st = stateRef.current
        const model = view.model

        // Modo relación
        if (st.linkMode) {
          if (!st.fromElement) {
            st.fromElement = model
            return
          }
          const from = st.fromElement
          const to = model
          if (from.id !== to.id) {
            const { link, data } = createLinkWithLabels(st.linkMode, from, to)
            if (link) {
              graph.addCell(link)
              cbRef.current.onLocalPatch?.({
                t: 'addLink',
                id: link.id,
                linkType: data.linkType,    // 'uml.Association', etc.
                source: data.source,
                target: data.target,
                labels: data.labels,        // ['1','0..*']
              })
            }
          }
          st.linkMode = null
          st.fromElement = null
          return
        }

        // Selección normal
        st.selected = model
        notifySelected(cbRef.current.onSelectionChanged, stateRef.current)
      })

      // Selección de link (multiplicidades)
      paper.on('link:pointerdown', linkView => {
        const link = linkView.model
        stateRef.current.selected = link
        notifySelected(cbRef.current.onSelectionChanged, stateRef.current)
      })

      // Movimiento de elementos → patch 'move' (si no está mute)
      const lastMoveSentRef = new Map()

      graph.on('change:position', cell => {
        if (stateRef.current.mute) return
        if (cell.isElement && cell.isElement()) {
          const now = performance.now()
          const last = lastMoveSentRef.get(cell.id) || 0
          if (now - last < 40) return
          lastMoveSentRef.set(cell.id, now)

          const pos = cell.position()
          cbRef.current.onLocalPatch?.({ t: 'move', id: cell.id, x: pos.x, y: pos.y })
        }
      })

      onReady?.()

      return () => {
        if (!mounted) return
        ro.disconnect()
        paperRef.current?.remove()
      }
    })()

    return () => { mounted = false }
  }, []) // 👈 sin deps, no re-montar

  // ---- Helpers ----
  function runMuted(fn) {
    stateRef.current.mute = true
    try { fn() } finally { stateRef.current.mute = false }
  }

  function internalAddClass(init) {
    if (!graphRef.current) return null
    const hasUML = !!joint.shapes.uml && !!joint.shapes.uml.Class

    const id = init?.id || (crypto?.randomUUID?.() || String(Date.now()))
    const name = init?.name || 'NuevaClase'
    const x = Number.isFinite(init?.x) ? init.x : 80 + Math.random() * 200
    const y = Number.isFinite(init?.y) ? init.y : 80 + Math.random() * 120

    let el
    if (hasUML) {
      const Class = joint.shapes.uml.Class
      el = new Class({
        id,
        position: { x, y },
        size: { width: 220, height: 120 },
        name,
        attributes: ['+ id: Long'],
        methods: [],
      })
    } else {
      el = new joint.shapes.standard.Rectangle({ id })
      el.resize(220, 120)
      el.position(x, y)
      el.attr({
        label: { text: name, fontWeight: '600' },
        body: { stroke: '#111', fill: '#fff' },
      })
      el.set('type', 'uml.Class')
      el.set('name', name)
      el.set('attributes', ['+ id: Long'])
    }

    graphRef.current.addCell(el)
    stateRef.current.selected = el
    notifySelected(cbRef.current.onSelectionChanged, stateRef.current)
    return { id: el.id, x, y, name: el.get('name') }
  }

  function setLinkLabel(link, index, value) {
    const labels = link.labels() || []
    if (!labels[0])
      link.appendLabel({
        attrs: { text: { text: '1' }, rect: { fill: 'white' } },
        position: { distance: 35, offset: -10 },
      })
    if (!labels[1])
      link.appendLabel({
        attrs: { text: { text: '0..*' }, rect: { fill: 'white' } },
        position: { distance: -35, offset: 10 },
      })
    link.label(index, { attrs: { text: { text: value || '' }, rect: { fill: 'white' } } })
  }

  useImperativeHandle(ref, () => ({
    clear() {
      graphRef.current?.clear()
      stateRef.current = { linkMode: null, fromElement: null, selected: null, mute: false }
      cbRef.current.onSelectionChanged?.(null)
    },

    addClass(init) {
      return internalAddClass(init)
    },

    setLinkMode(type) {
      stateRef.current.linkMode = type // 'association'|'aggregation'|'composition'|'generalization'
      stateRef.current.fromElement = null
    },

    addAttributeToSelected() {
      const el = stateRef.current.selected
      if (!el || el.get('type') !== 'uml.Class') return
      const next = [...(el.get('attributes') || []), '+ nuevo: String']
      el.set('attributes', next)
      notifySelected(cbRef.current.onSelectionChanged, stateRef.current)
    },

    renameSelected(name) {
      const el = stateRef.current.selected
      if (!el || el.get('type') !== 'uml.Class') return
      el.set('name', name)
      notifySelected(cbRef.current.onSelectionChanged, stateRef.current)
    },

    updateAttributeOfSelected(index, value) {
      const el = stateRef.current.selected
      if (!el || el.get('type') !== 'uml.Class') return
      const attrs = [...(el.get('attributes') || [])]
      attrs[index] = value
      el.set('attributes', attrs)
      notifySelected(cbRef.current.onSelectionChanged, stateRef.current)
    },

    removeAttributeOfSelected(index) {
      const el = stateRef.current.selected
      if (!el || el.get('type') !== 'uml.Class') return
      const attrs = [...(el.get('attributes') || [])]
      attrs.splice(index, 1)
      el.set('attributes', attrs)
      notifySelected(cbRef.current.onSelectionChanged, stateRef.current)
    },

    deleteSelected() {
      const el = stateRef.current.selected
      if (!el) return
      if (el.isElement && el.isElement()) {
        const links = graphRef.current.getConnectedLinks(el) || []
        links.forEach(l => l.remove())
      }
      el.remove()
      stateRef.current.selected = null
      cbRef.current.onSelectionChanged?.(null)
    },

    getGraphJSON() {
      return graphRef.current.toJSON()
    },

    loadFromJSON(json) {
      runMuted(() => {
        graphRef.current.fromJSON(json)
      })
      // limpiar selección
      cbRef.current.onSelectionChanged?.(null)
    },

    // Multiplicidades (local) → también emite WS
    updateMultiplicity(index, value) {
      const link = stateRef.current.selected
      if (!link || !link.isLink()) return
      setLinkLabel(link, index, value)
      notifySelected(cbRef.current.onSelectionChanged, stateRef.current)
      cbRef.current.onLocalPatch?.({ t: 'setMult', id: link.id, index, value })
    },

    // Aplicar patches remotos (sin re-emitir)
    applyPatch(patch) {
      if (!patch || !graphRef.current) return
      const type = patch.t
      const get = id => graphRef.current.getCell(id)

      switch (type) {
        case 'addClass': {
          if (get(patch.id)) return
          return runMuted(() =>
            internalAddClass({ id: patch.id, name: patch.name, x: patch.x, y: patch.y })
          )
        }
        case 'delClass': {
          const el = get(patch.id)
          if (!el) return
          runMuted(() => {
            if (el.isElement && el.isElement()) {
              const links = graphRef.current.getConnectedLinks(el) || []
              links.forEach(l => l.remove())
            }
            el.remove()
          })
          if (stateRef.current.selected?.id === patch.id) cbRef.current.onSelectionChanged?.(null)
          return
        }
        case 'rename': {
          const el = get(patch.id)
          if (el && el.get('type') === 'uml.Class') {
            el.set('name', patch.name || el.get('name'))
            if (stateRef.current.selected?.id === el.id) {
              notifySelected(cbRef.current.onSelectionChanged, stateRef.current)
            }
          }
          return
        }
        case 'move': {
          const el = get(patch.id)
          if (el && el.isElement && el.isElement()) {
            runMuted(() => el.position(patch.x, patch.y))
          }
          return
        }
        case 'addLink': {
          if (get(patch.id)) return
          const from = get(patch.source)
          const to = get(patch.target)
          if (!from || !to) return
          runMuted(() => {
            const { link } = createLinkWithLabels(
              patch.linkType, // 'uml.Association' o 'association'
              from,
              to,
              patch.id,
              patch.labels
            )
            if (link) graphRef.current.addCell(link)
          })
          return
        }
        case 'setMult': {
          const link = get(patch.id)
          if (!link || !link.isLink()) return
          runMuted(() => setLinkLabel(link, patch.index, patch.value))
          if (stateRef.current.selected?.id === link.id) {
            notifySelected(cbRef.current.onSelectionChanged, stateRef.current)
          }
          return
        }
        case 'addAttr': {
          const el = get(patch.id)
          if (el && el.get('type') === 'uml.Class') {
            const attrs = [...(el.get('attributes') || [])]
            attrs.push(patch.value)
            el.set('attributes', attrs)
            if (stateRef.current.selected?.id === el.id) {
              notifySelected(cbRef.current.onSelectionChanged, stateRef.current)
            }
          }
          return
        }
        case 'updAttr': {
          const el = get(patch.id)
          if (el && el.get('type') === 'uml.Class') {
            const attrs = [...(el.get('attributes') || [])]
            if (attrs[patch.index] !== undefined) {
              attrs[patch.index] = patch.value
              el.set('attributes', attrs)
              if (stateRef.current.selected?.id === el.id) {
                notifySelected(cbRef.current.onSelectionChanged, stateRef.current)
              }
            }
          }
          return
        }
        case 'delAttr': {
          const el = get(patch.id)
          if (el && el.get('type') === 'uml.Class') {
            const attrs = [...(el.get('attributes') || [])]
            if (attrs[patch.index] !== undefined) {
              attrs.splice(patch.index, 1)
              el.set('attributes', attrs)
              if (stateRef.current.selected?.id === el.id) {
                notifySelected(cbRef.current.onSelectionChanged, stateRef.current)
              }
            }
          }
          return
        }
        default:
          return
      }
    },
  }))

  return <div className="canvas" ref={containerRef} />
})

export default Canvas

// ------------ Helpers ------------
function createLinkWithLabels(type, from, to, forcedId, labels = ['1', '0..*']) {
  const normalize = (t) => (t?.split('.').pop() || t || '').toLowerCase()
  const key = normalize(type)

  const s = { id: from.id }
  const t = { id: to.id }
  let link
  let linkType

  switch (key) {
    case 'association':
      linkType = 'uml.Association'
      link = new joint.shapes.uml.Association({ id: forcedId, source: s, target: t })
      break
    case 'aggregation':
      linkType = 'uml.Aggregation'
      link = new joint.shapes.uml.Aggregation({ id: forcedId, source: s, target: t })
      break
    case 'composition':
      linkType = 'uml.Composition'
      link = new joint.shapes.uml.Composition({ id: forcedId, source: s, target: t })
      break
    case 'generalization':
      linkType = 'uml.Generalization'
      link = new joint.shapes.uml.Generalization({ id: forcedId, source: s, target: t })
      break
    default:
      return { link: null, data: null }
  }

  // labels por defecto
  link.appendLabel({
    attrs: { text: { text: labels[0] ?? '1' }, rect: { fill: 'white' } },
    position: { distance: 35, offset: -10 },
  })
  link.appendLabel({
    attrs: { text: { text: labels[1] ?? '0..*' }, rect: { fill: 'white' } },
    position: { distance: -35, offset: 10 },
  })

  return {
    link,
    data: {
      linkType,               // 'uml.Association', etc.
      source: from.id,
      target: to.id,
      labels: [labels[0] ?? '1', labels[1] ?? '0..*'],
    },
  }
}

function notifySelected(onSelectionChanged, st) {
  const el = st.selected
  if (!el) { onSelectionChanged?.(null); return }
  if (el.isLink && el.isLink()) {
    const labels = el.labels() || []
    const m0 = labels[0]?.attrs?.text?.text || '1'
    const m1 = labels[1]?.attrs?.text?.text || '0..*'
    onSelectionChanged?.({
      id: el.id,
      type: el.get('type'),
      isLink: true,
      multSource: m0,
      multTarget: m1,
    })
  } else {
    onSelectionChanged?.({
      id: el.id,
      type: el.get('type'),
      name: el.get('name'),
      attributes: el.get('attributes') || [],
    })
  }
}
