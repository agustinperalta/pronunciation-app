import { useState } from 'react'
import { api } from '../services/api'
import { useSpeech } from '../hooks/useSpeech'

function formatMs(ms) {
  const s = Math.ceil(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function Trainer({ list, onListUpdate }) {
  const [newWord, setNewWord] = useState('')
  const [duration, setDuration] = useState(5)
  const [pause, setPause] = useState(1.5)
  const [shuffle, setShuffle] = useState(false)

  const {
    voices, selectedVoice, setSelectedVoice,
    isPlaying, currentWord, currentIndex,
    progress, timeLeft,
    startLoop, stopLoop,
  } = useSpeech()

  const addWord = async () => {
    const parts = newWord.split(/[\s,;]+/).filter(Boolean)
    if (!parts.length) return
    let updated = list
    for (const w of parts) {
      try { updated = await api.addWord(list.id, w) } catch (e) { /* skip dup */ }
    }
    onListUpdate(updated)
    setNewWord('')
  }

  const removeWord = async (word) => {
    if (isPlaying) return
    const updated = await api.removeWord(list.id, word)
    onListUpdate(updated)
  }

  const toggle = () => {
    if (isPlaying) {
      stopLoop()
    } else {
      let words = [...list.words]
      if (shuffle) words = words.sort(() => Math.random() - 0.5)
      startLoop({ words, durationMinutes: duration, pauseSeconds: pause, voice: selectedVoice })
    }
  }

  return (
    <div className="trainer">
      <div className="trainer-top">
        <h2 className="trainer-title">{list.name}</h2>
        <span className="word-count">{list.words.length} palabras</span>
      </div>

      {/* Add words */}
      <div className="add-row">
        <input
          value={newWord}
          onChange={e => setNewWord(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addWord()}
          placeholder="Agregar palabra(s), separadas por coma..."
          className="input-main"
          disabled={isPlaying}
        />
        <button className="btn-add" onClick={addWord} disabled={isPlaying}>+ Agregar</button>
      </div>

      {/* Word chips */}
      <div className="chips-wrap">
        {list.words.length === 0 && (
          <span className="chips-empty">Aún no hay palabras en esta lista</span>
        )}
        {list.words.map((w, i) => (
          <div
            key={w}
            className={`chip ${currentWord === w && isPlaying ? 'chip-active' : ''}`}
          >
            {currentWord === w && isPlaying && <span className="chip-dot" />}
            {w}
            {!isPlaying && (
              <button className="chip-remove" onClick={() => removeWord(w)}>×</button>
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="controls-grid">
        <div className="control-block">
          <label className="ctrl-label">Duración</label>
          <div className="ctrl-value">{duration} min</div>
          <input type="range" min="1" max="30" step="1" value={duration}
            onChange={e => setDuration(Number(e.target.value))} disabled={isPlaying} />
        </div>
        <div className="control-block">
          <label className="ctrl-label">Pausa entre palabras</label>
          <div className="ctrl-value">{pause} s</div>
          <input type="range" min="0.5" max="5" step="0.5" value={pause}
            onChange={e => setPause(Number(e.target.value))} disabled={isPlaying} />
        </div>
      </div>

      <div className="options-row">
        <div className="voice-wrap">
          <label className="ctrl-label">Voz</label>
          <select
            value={selectedVoice?.name || ''}
            onChange={e => setSelectedVoice(voices.find(v => v.name === e.target.value))}
            disabled={isPlaying}
            className="voice-select"
          >
            {voices.map(v => (
              <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
            ))}
          </select>
        </div>
        <label className="shuffle-label">
          <input type="checkbox" checked={shuffle}
            onChange={e => setShuffle(e.target.checked)} disabled={isPlaying} />
          Orden aleatorio
        </label>
      </div>

      {/* Play button */}
      <button
        className={`play-btn ${isPlaying ? 'playing' : ''}`}
        onClick={toggle}
        disabled={list.words.length === 0}
      >
        {isPlaying ? '⏹ Detener' : '▶ Iniciar pronunciación'}
      </button>

      {/* Progress */}
      {isPlaying && (
        <div className="progress-section">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-meta">
            <span className="now-word">🔊 {currentWord}</span>
            <span className="time-left">{formatMs(timeLeft)} restante</span>
          </div>
        </div>
      )}
    </div>
  )
}
