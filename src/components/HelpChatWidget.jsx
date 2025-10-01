import React, { useState, useRef, useEffect } from 'react'

export default function HelpChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        '¡Hola! Soy tu asistente. Pregúntame cómo usar el Diagramador, generar código o PDF, etc.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = async () => {
    const q = input.trim()
    if (!q || loading) return
    setMessages(m => [...m, { role: 'user', content: q }])
    setInput('')
    try {
      setLoading(true)
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Error del chat')
      }
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.answer || 'Sin respuesta.' }])
    } catch (e) {
      setMessages(m => [
        ...m,
        { role: 'assistant', content: 'Ups, no pude responder ahora. Intenta de nuevo.' },
      ])
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* Burbuja flotante */}
      <button className="help-bubble" onClick={() => setOpen(v => !v)} title="Ayuda">
        ?
      </button>

      {open && (
        <div className="help-panel">
          <div className="help-header">
            <strong>Ayuda</strong>
            <button className="x" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <div className="help-body">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <div className="bubble">{m.content}</div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="help-input">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Escribe tu pregunta…"
              rows={2}
              disabled={loading}
            />
            <button onClick={send} disabled={loading || !input.trim()}>
              {loading ? '...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}

      {/* estilos mínimos */}
      <style jsx>{`
        .help-bubble {
          position: fixed;
          right: 16px;
          bottom: 16px;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          background: #111;
          color: #fff;
          font-size: 20px;
          cursor: pointer;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
          z-index: 1100;
        }
        .help-panel {
          position: fixed;
          right: 16px;
          bottom: 76px;
          width: 340px;
          max-height: 60vh;
          background: #fff;
          border: 1px solid #e6e6e6;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 1100;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
          color: #111; /* 👈 texto oscuro */
        }
        .help-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 10px;
          background: #f7f7f9;
          border-bottom: 1px solid #eee;
          color: #111; /* 👈 texto oscuro */
        }
        .help-header .x {
          border: none;
          background: transparent;
          font-size: 18px;
          cursor: pointer;
          color: #111;
        }
        .help-body {
          padding: 10px;
          overflow: auto;
          flex: 1;
          background: #fafafb;
          color: #111;
        } /* 👈 */
        .msg {
          display: flex;
          margin-bottom: 8px;
        }
        .msg.user {
          justify-content: flex-end;
        }
        .msg .bubble {
          max-width: 80%;
          padding: 8px 10px;
          border-radius: 10px;
          font-size: 14px;
          line-height: 1.3;
          white-space: pre-wrap;
          color: #111; /* 👈 */
        }
        .msg.user .bubble {
          background: #dff1ff;
        }
        .msg.assistant .bubble {
          background: #eef0f3;
        }
        .help-input {
          display: flex;
          gap: 6px;
          padding: 8px;
          border-top: 1px solid #eee;
          background: #fff;
          color: #111; /* 👈 */
        }
        .help-input textarea {
          flex: 1;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 8px;
          resize: none;
          color: #111; /* 👈 */
        }
        .help-input textarea::placeholder {
          color: #666;
        } /* mejor contraste del placeholder */
        .help-input button {
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 8px;
          background: #f7f7f7;
          color: #111;
        } /* 👈 */
        .help-input button[disabled] {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </>
  )
}
