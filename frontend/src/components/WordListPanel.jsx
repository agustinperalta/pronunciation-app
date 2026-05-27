import { useState } from 'react'
import { api } from '../services/api'

export function WordListPanel({ lists, onListsChange, activeListId, onSelectList }) {
  const [newListName, setNewListName] = useState('')
  const [loading, setLoading] = useState(false)

  const createList = async () => {
    const name = newListName.trim()
    if (!name) return
    setLoading(true)
    try {
      const created = await api.createList(name, [])
      onListsChange(prev => [...prev, created])
      onSelectList(created.id)
      setNewListName('')
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteList = async (id, e) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar esta lista?')) return
    await api.deleteList(id)
    onListsChange(prev => prev.filter(l => l.id !== id))
    if (activeListId === id) onSelectList(null)
  }

  return (
    <aside className="list-panel">
      <div className="panel-header">
        <span className="panel-title">Mis listas</span>
      </div>

      <div className="new-list-row">
        <input
          value={newListName}
          onChange={e => setNewListName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createList()}
          placeholder="Nombre de nueva lista..."
          className="input-sm"
        />
        <button className="btn-icon" onClick={createList} disabled={loading} title="Crear lista">
          +
        </button>
      </div>

      <ul className="list-items">
        {lists.length === 0 && (
          <li className="list-empty">Sin listas aún</li>
        )}
        {lists.map(l => (
          <li
            key={l.id}
            className={`list-item ${activeListId === l.id ? 'active' : ''}`}
            onClick={() => onSelectList(l.id)}
          >
            <span className="list-name">{l.name}</span>
            <span className="list-meta">{l.words.length} palabras</span>
            <button
              className="list-delete"
              onClick={e => deleteList(l.id, e)}
              title="Eliminar lista"
            >×</button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
