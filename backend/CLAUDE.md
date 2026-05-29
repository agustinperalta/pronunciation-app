# Backend — FastAPI

## Responsabilidad
API REST para gestionar listas de palabras. Solo persistencia y lógica de negocio. El TTS ocurre en el frontend.

## Archivo principal
`main.py` — contiene toda la app, modelos Pydantic y endpoints.

## Endpoints disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/lists` | Obtener todas las listas |
| POST | `/api/lists` | Crear nueva lista `{name, words[]}` |
| DELETE | `/api/lists/{id}` | Eliminar lista |
| GET | `/api/lists/{id}` | Obtener lista por ID |
| POST | `/api/lists/{id}/words` | Agregar palabra `{word}` |
| DELETE | `/api/lists/{id}/words/{word}` | Eliminar palabra |

## Modelos Pydantic

```python
class WordList(BaseModel):
    name: str
    words: List[str]

class WordListResponse(BaseModel):
    id: str
    name: str
    words: List[str]
```

## Store actual
```python
word_lists: dict = {}
# Estructura:
# {
#   "a3f9b2c1": {"name": "Mi lista", "words": ["hello", "world"]},
# }
```

## Lógica de negocio
- IDs generados con `uuid4()[:8]`
- Palabras deduplicadas con `dict.fromkeys()` para mantener orden
- Palabras normalizadas a minúsculas con `.strip().lower()`
- CORS habilitado para `localhost:5173` y `localhost:3000`

## Próximos pasos pendientes
- [ ] Migrar store a SQLite con SQLAlchemy
- [ ] Agregar modelos de usuario y autenticación
- [ ] Variables de entorno con `python-dotenv`
- [ ] Tests con pytest

## Correr en desarrollo
```bash
uvicorn main:app --reload
```

## Dependencias
Ver `requirements.txt`. Siempre usar `pip install -r requirements.txt` dentro del venv.
