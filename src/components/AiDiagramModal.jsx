import React, { useEffect } from 'react'
import { useSpeechToText } from '../utils/useSpeechToText'

export default function AIDiagramModal({ open, onCancel, onConfirm, value, onChange, loading }) {
  const { supported, isListening, start, stop, error } = useSpeechToText({
    lang: 'es-ES',
    interim: true,
    continuous: false,
    onResult: (text, { final }) => {
      if (!text) return
      if (final) {
        const next = (value?.trim() ? value + ' ' : '') + text
        onChange?.(next.trim())
      }
    },
  })

  useEffect(() => {
    if (!open) stop()
  }, [open, stop])

  if (!open) return null

  const toggleListening = () => (isListening ? stop() : start())

  const handleSubmit = async e => {
    e?.preventDefault?.()
    if (!value?.trim()) return
    await onConfirm?.() // App usa aiPrompt, que viene de value/onChange
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Diagrama con IA</h3>
        <p className="muted">
          Describe lo que quieres (p. ej. “diagrama de clases para una clínica…”)
        </p>

        <textarea
          value={value || ''}
          onChange={e => onChange?.(e.target.value)}
          placeholder="Escribe o dicta tu solicitud…"
          rows={6}
          disabled={loading}
        />

        <div className="row gap">
          <button type="button" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>

          {supported ? (
            <button
              type="button"
              onClick={toggleListening}
              className={isListening ? 'mic listening' : 'mic'}
              title={isListening ? 'Detener dictado' : 'Dictar con voz'}
              disabled={loading}
            >
              {isListening ? '🛑 Detener' : '🎤 Dictar'}
            </button>
          ) : (
            <button type="button" disabled className="mic" title="No soportado por este navegador">
              🎤 No disponible
            </button>
          )}

          <button onClick={handleSubmit} disabled={loading || !value?.trim()}>
            {loading ? 'Generando…' : 'Generar'}
          </button>
        </div>

        {error && <div style={{ color: 'tomato', marginTop: 8 }}>Voz: {String(error)}</div>}
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal {
          width: min(680px, 92vw);
          background: #fff;
          border-radius: 12px;
          padding: 16px 18px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }
        h3 {
          margin: 0 0 6px;
          color: #282d65;
        }
        .muted {
          margin: 0 0 10px;
          color: #666;
          font-size: 0.9rem;
        }
        textarea {
          width: 100%;
          resize: vertical;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
        }
        .row {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          margin-top: 12px;
        }
        .gap > * {
          margin-left: 8px;
        }
        .mic.listening {
          background: #ffe8e8;
          border-color: #ffb3b3;
        }
        button {
          padding: 8px 12px;
          border-radius: 8px;
          color: black;
          border: 1px solid #ccc;
          background: #f7f7f7;
          cursor: pointer;
        }
        button[disabled] {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
