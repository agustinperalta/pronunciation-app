# Frontend — React + Vite

## Responsabilidad
UI de la app. Maneja listas de palabras via API y ejecuta el loop de pronunciación con Web Speech API nativa del navegador.

## Estructura de componentes

```
App.jsx                        # Raíz: fetcha listas al montar, maneja activeListId
├── WordListPanel.jsx          # Sidebar izquierdo
│   └── Crear / listar / eliminar listas (llama a api.js)
└── Trainer.jsx                # Panel principal
    └── Agregar/eliminar palabras + controles del loop TTS
        ├── useSpeech.js       # Hook que encapsula toda la lógica de audio
        └── phonetics.js       # Obtiene transcripción fonética de la palabra actual
```

## Flujo de datos
```
Backend API
    ↓ api.js (fetch)
App.jsx (estado: lists[], activeListId)
    ↓ props
WordListPanel → onListsChange, onSelectList
Trainer → list, onListUpdate
    ↓ hook                          ↓ servicio externo
useSpeech → isPlaying,         phonetics.js → dictionaryapi.dev
            currentWord,           ↓
            progress, timeLeft  currentPhonetic (transcripción IPA→español)
```

## Hook useSpeech — API pública
```js
const {
  voices,           // voces en inglés disponibles en el sistema
  selectedVoice,    // voz seleccionada
  setSelectedVoice,
  isPlaying,        // bool — loop activo
  currentWord,      // palabra pronunciándose ahora
  currentIndex,     // índice en el array de palabras
  progress,         // 0-100 para la barra de progreso
  timeLeft,         // ms restantes
  startLoop,        // fn({ words, durationMinutes, pauseSeconds, voice })
  stopLoop,         // fn()
  jumpTo,           // fn(index) — salta a esa palabra durante el loop
  speakOnce,        // fn(word) — pronuncia una palabra fuera del loop
} = useSpeech()
```

## Servicio API — api.js
```js
api.getLists()
api.createList(name, words)
api.deleteList(id)
api.addWord(id, word)
api.removeWord(id, word)
```
**Siempre usar api.js, nunca fetch directo desde componentes.**

## Servicio de fonética — phonetics.js
```js
getPhonetic(phrase)  // async → string | null
```
- Llama a `dictionaryapi.dev` para obtener la transcripción IPA de cada palabra.
- Convierte IPA a fonética aproximada en español con `ipaToSpanish()` (tabla de mapeos de fonemas + marca de acento tónico).
- Cachea resultados en memoria (`const cache = {}`) durante la sesión.
- Usado por `Trainer.jsx` para mostrar el bloque **"Suena como"** mientras el loop está activo.

## Estilos
- CSS puro en `App.css`, sin librerías de UI
- Variables CSS en `:root` — usar siempre variables, no valores hardcodeados
- Fuentes: `Fraunces` (títulos) + `DM Mono` (texto general)
- Variables principales:
  ```css
  --bg, --surface, --border
  --text, --muted
  --accent, --accent-light, --accent-mid
  --danger, --green
  --mono, --serif
  ```

## Proxy Vite
`/api/*` se redirige automáticamente a `http://localhost:8000` en desarrollo. No hardcodear la URL del backend en los componentes.

## Correr en desarrollo
```bash
npm run dev
# → http://localhost:5173
```

## Próximos pasos pendientes
- [ ] Importar palabras desde archivo .txt / .csv
- [ ] Velocidad de habla ajustable
- [ ] Persistencia local con localStorage como fallback
- [ ] Historial de sesiones de práctica
- [ ] Modo oscuro
