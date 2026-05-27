import { useState, useEffect } from 'react'
import { WordListPanel } from './components/WordListPanel'
import { Trainer } from './components/Trainer'
import { api } from './services/api'
import './App.css'

export default function App() {
  const [lists, setLists] = useState([])
  const [activeListId, setActiveListId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getLists()
      .then(data => { setLists(data); setLoading(false) })
      .catch(() => { setError('No se pudo conectar con el servidor'); setLoading(false) })
  }, [])

  const activeList = lists.find(l => l.id === activeListId) || null

  const handleListUpdate = (updated) => {
    setLists(prev => prev.map(l => l.id === updated.id ? updated : l))
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">🗣</span>
          <span className="logo-text">PronounceLoop</span>
        </div>
        <span className="header-sub">Entrenador de pronunciación en inglés</span>
      </header>

      <main className="app-body">
        {loading && <div className="state-msg">Conectando con el servidor...</div>}
        {error && <div className="state-msg error">{error}<br/><small>¿Está corriendo el backend en localhost:8000?</small></div>}

        {!loading && !error && (
          <>
            <WordListPanel
              lists={lists}
              onListsChange={setLists}
              activeListId={activeListId}
              onSelectList={setActiveListId}
            />

            <section className="trainer-area">
              {!activeList ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <p>Selecciona o crea una lista para comenzar</p>
                </div>
              ) : (
                <Trainer
                  list={activeList}
                  onListUpdate={handleListUpdate}
                />
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
