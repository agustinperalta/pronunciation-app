import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useSpeech } from '../hooks/useSpeech'
import { useUser } from '../hooks/useUser'
import { getPhonetic } from '../services/phonetics'
import { AccessCodeModal } from './AccessCodeModal'

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
  const [currentPhonetic, setCurrentPhonetic] = useState(null)
  const [showCodeModal, setShowCodeModal] = useState(false)

  const { userKey, status, refresh: refreshUser } = useUser()

  const {
    voices, selectedVoice, setSelectedVoice,
    isPlaying, currentWord, currentIndex,
    progress, timeLeft,
    startLoop, stopLoop, jumpTo, speakOnce,
  } = useSpeech()

  useEffect(() => {
    if (!currentWord) { setCurrentPhonetic(null); return }
    setCurrentPhonetic(null)
    getPhonetic(currentWord).then(setCurrentPhonetic)
  }, [currentWord])

  const handleChipClick = (word, index) => {
    if (isPlaying) {
      jumpTo(index)
    } else {
      speakOnce(word)
    }
  }

  const addWord = async () => {
    const entries = newWord.split(/[,;]+/).map(s => s.trim()).filter(Boolean)
    if (!entries.length) return
    let updated = list
    for (const entry of entries) {
      const wordCount = entry.split(/\s+/).filter(Boolean).length
      if (wordCount === 0 || wordCount > 2) continue
      try { updated = await api.addWord(list.id, entry) } catch (e) { /* skip dup */ }
    }
    onListUpdate(updated)
    setNewWord('')
  }

  const removeWord = async (word) => {
    if (isPlaying) return
    const updated = await api.removeWord(list.id, word)
    onListUpdate(updated)
  }

  const toggle = async () => {
    if (isPlaying) {
      stopLoop()
      return
    }
    const result = await api.startLoop(userKey)
    if (!result.allowed) {
      setShowCodeModal(true)
      return
    }
    refreshUser()
    let words = [...list.words]
    if (shuffle) words = words.sort(() => Math.random() - 0.5)
    startLoop({ words, durationMinutes: duration, pauseSeconds: pause, voice: selectedVoice })
  }

  const loopsBadge = () => {
    if (status.is_unlimited) return 'Acceso ilimitado'
    if (status.loops_remaining === 0) return '0 loops restantes'
    return `${status.loops_remaining} loops gratuitos restantes`
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
          placeholder="Agregar palabra o frase (máx. 2 palabras), separar con coma..."
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
            onClick={() => handleChipClick(w, i)}
          >
            {currentWord === w && isPlaying && <span className="chip-dot" />}
            {w}
            {!isPlaying && (
              <button className="chip-remove" onClick={e => { e.stopPropagation(); removeWord(w) }}>×</button>
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
      <div className={`loops-badge ${status.is_unlimited ? 'loops-unlimited' : status.loops_remaining === 0 ? 'loops-empty' : ''}`}>
        {loopsBadge()}
      </div>

      {/* Speaking display */}
      {isPlaying && currentWord && (
        <div className="speaking-display">
          <div className="speaking-label-top">Suena como</div>
          <div className="speaking-word">{currentPhonetic || currentWord}</div>
          {currentPhonetic && <div className="speaking-original">{currentWord}</div>}
        </div>
      )}

      {/* Progress */}
      {isPlaying && (
        <div className="progress-section">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-meta">
            <span className="now-word">{currentWord}</span>
            <span className="time-left">{formatMs(timeLeft)} restante</span>
          </div>
        </div>
      )}

      {showCodeModal && (
        <AccessCodeModal
          userKey={userKey}
          onSuccess={refreshUser}
          onClose={() => setShowCodeModal(false)}
        />
      )}
    </div>
  )
}
