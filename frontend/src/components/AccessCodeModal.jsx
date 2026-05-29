import { useState } from 'react'
import { api } from '../services/api'

export function AccessCodeModal({ userKey, onSuccess, onClose }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError(null)
    try {
      await api.validateCode(userKey, code.trim())
      setDone(true)
      setTimeout(() => { onSuccess(); onClose() }, 1800)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        {done ? (
          <div className="modal-success">
            <div className="modal-success-icon">✓</div>
            <p>Acceso ilimitado desbloqueado</p>
          </div>
        ) : (
          <>
            <h2 className="modal-title">Límite alcanzado</h2>
            <p className="modal-body">
              Usaste tus 50 loops gratuitos. Ingresá un código de acceso para continuar sin límites.
            </p>
            <form onSubmit={handleSubmit} className="modal-form">
              <input
                className="modal-input"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX"
                autoFocus
                disabled={loading}
                spellCheck={false}
              />
              {error && <p className="modal-error">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={onClose} disabled={loading}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={loading || !code.trim()}>
                  {loading ? 'Verificando...' : 'Activar código'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
