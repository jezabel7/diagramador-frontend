import { useEffect, useRef, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

export function useGraphWs({ docId = 'demo', onPatch }) {
  const clientRef = useRef(null)
  const connectedRef = useRef(false)
  const queueRef = useRef([])
  const clientIdRef = useRef(
    (crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10)) // id de este tab
  )

  useEffect(() => {
    const WS_BASE = import.meta.env.VITE_WS_BASE
      if (!WS_BASE) {
        console.error('Falta VITE_WS_BASE (https://tu-backend)')
        return
      }
    const sock = new SockJS(`${WS_BASE}/ws`)
    const client = new Client({
      webSocketFactory: () => sock,
      reconnectDelay: 1500,
      onConnect: () => {
        connectedRef.current = true
        client.subscribe(`/topic/graph.${docId}`, msg => {
          try {
            const patch = JSON.parse(msg.body)
            // 👇 ignora lo que enviaste tú mismo
            if (patch?._by === clientIdRef.current) return
            onPatch?.(patch)
          } catch (e) {
            console.error('WS patch inválido:', e)
          }
        })
        // vaciar cola
        const toSend = queueRef.current.splice(0, 200)
        for (const p of toSend) {
          try {
            client.publish({ destination: `/app/graph.update.${docId}`, body: JSON.stringify(p) })
          } catch (e) {
            queueRef.current.unshift(p)
            break
          }
        }
      },
      onStompError: f => { console.error('STOMP error', f); connectedRef.current = false },
      onWebSocketClose: () => { connectedRef.current = false },
    })
    client.activate()
    clientRef.current = client
    return () => { connectedRef.current = false; client.deactivate() }
  }, [docId, onPatch])

  const sendPatch = useCallback((patch) => {
    const payload = { ...patch, _by: clientIdRef.current } // marca el emisor
    try {
      const client = clientRef.current
      if (!client || !connectedRef.current) {
        // dedupe simple para move
        if (payload?.t === 'move') {
          const idx = queueRef.current.findIndex(p => p?.t === 'move' && p?.id === payload.id)
          if (idx >= 0) queueRef.current.splice(idx, 1, payload)
          else queueRef.current.push(payload)
        } else {
          queueRef.current.push(payload)
        }
        return
      }
      client.publish({
        destination: `/app/graph.update.${docId}`,
        body: JSON.stringify(payload),
      })
    } catch {
      // nunca lances, encola
      queueRef.current.push(payload)
    }
  }, [docId])

  return { sendPatch }
}
