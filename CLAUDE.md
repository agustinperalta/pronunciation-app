# PronounceLoop

App de entrenamiento de pronunciación en inglés con listas de palabras personalizadas y loop de audio configurable.

## Stack
- **Backend**: FastAPI (Python) → `/backend`
- **Frontend**: React + Vite → `/frontend`

## Estructura del proyecto
```
pronunciation-app/
├── backend/
│   ├── main.py              # FastAPI app, endpoints REST, store en memoria
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Componente raíz, maneja estado global de listas
│   │   ├── App.css          # Estilos globales, variables CSS, diseño editorial
│   │   ├── main.jsx         # Entry point React
│   │   ├── components/
│   │   │   ├── WordListPanel.jsx   # Sidebar: crear, listar, eliminar listas
│   │   │   └── Trainer.jsx         # Panel principal: agregar palabras, loop TTS
│   │   ├── hooks/
│   │   │   └── useSpeech.js        # Hook Web Speech API: loop, voces, progreso
│   │   └── services/
│   │       ├── api.js              # Cliente HTTP hacia el backend
│   │       └── phonetics.js        # Convierte IPA → fonética española (dictionaryapi.dev)
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .claude/
│   └── settings.json        # Config local Claude Code (no subir a git)
├── .gitignore
└── README.md
```

## Comandos para correr el proyecto

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload
# → http://localhost:8000
# → Docs: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## Decisiones técnicas
- El store del backend es **en memoria** (dict Python) — se pierde al reiniciar. Pendiente migrar a SQLite.
- El TTS usa **Web Speech API** nativa del navegador, sin dependencias externas ni costo.
- La fonética española se obtiene de `dictionaryapi.dev` (gratuita, sin key), convirtiendo IPA con tabla de mapeos en `phonetics.js`. Se cachea en memoria por sesión.
- El frontend usa **Vite proxy** para redirigir `/api` al backend en desarrollo.
- Estilos con **CSS puro** usando variables CSS, sin Tailwind ni librerías de UI.
- Fuentes: `Fraunces` (display serif) + `DM Mono` (monospace) desde Google Fonts.

## Convenciones
- Componentes React en PascalCase
- Hooks con prefijo `use`
- Servicios HTTP centralizados en `services/api.js` — nunca hacer fetch directo desde componentes
- CSS organizado por componente dentro de `App.css`
- Variables de entorno del backend vía `.env` (pendiente implementar)

## Lo que NO hacer
- No hacer llamadas fetch directas desde componentes, usar siempre `api.js`
- No guardar estado de audio fuera del hook `useSpeech`
- No instalar librerías de UI (MUI, Ant Design, etc.) — el diseño es custom
- No modificar `vite.config.js` sin revisar el proxy configurado
