# PronounceLoop 🗣

Entrenador de pronunciación en inglés con FastAPI + React.

## Estructura del proyecto

```
pronunciation-app/
├── backend/
│   ├── main.py            # FastAPI app con endpoints REST
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx         # Componente raíz
    │   ├── App.css         # Estilos globales
    │   ├── main.jsx        # Entry point
    │   ├── components/
    │   │   ├── WordListPanel.jsx   # Sidebar de listas
    │   │   └── Trainer.jsx         # Player de pronunciación
    │   ├── hooks/
    │   │   └── useSpeech.js        # Hook Web Speech API
    │   └── services/
    │       └── api.js              # Cliente HTTP al backend
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## Puesta en marcha

### 1. Backend (FastAPI)

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Correr el servidor
uvicorn main:app --reload
# → http://localhost:8000
# → Docs: http://localhost:8000/docs
```

### 2. Frontend (React + Vite)

```bash
cd frontend

npm install
npm run dev
# → http://localhost:5173
```

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/lists | Obtener todas las listas |
| POST | /api/lists | Crear nueva lista |
| DELETE | /api/lists/{id} | Eliminar lista |
| POST | /api/lists/{id}/words | Agregar palabra |
| DELETE | /api/lists/{id}/words/{word} | Eliminar palabra |

## Funcionalidades

- **Múltiples listas** de palabras guardadas en el backend
- **Text-to-Speech** nativo del navegador (Web Speech API)
- **Loop configurable** por duración (1–30 min)
- **Pausa ajustable** entre palabras (0.5–5 s)
- **Selección de voz** en inglés disponibles en tu sistema
- **Orden aleatorio** opcional
- **Resaltado en tiempo real** de la palabra actual

## Próximos pasos sugeridos

- [ ] Agregar base de datos (SQLite con SQLAlchemy)
- [ ] Persistencia en localStorage como fallback
- [ ] Importar palabras desde archivo .txt / .csv
- [ ] Velocidad de habla ajustable
- [ ] Historial de sesiones de práctica
