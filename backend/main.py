from fastapi import FastAPI, HTTPException, Header, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from contextlib import asynccontextmanager, contextmanager
import uuid
import sqlite3
import json
import os
import secrets
import string
from datetime import datetime, timezone

DB_PATH = os.getenv("DB_PATH", "pronunciation.db")
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "admin-dev-secret")
FREE_LOOP_LIMIT = int(os.getenv("FREE_LOOP_LIMIT", "50"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "")
INITIAL_CODES = 30


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _make_code():
    chars = string.ascii_uppercase + string.digits
    return '-'.join(''.join(secrets.choice(chars) for _ in range(4)) for _ in range(3))


def _seed_codes(conn, n: int):
    now = datetime.now(timezone.utc).isoformat()
    for _ in range(n):
        code = _make_code()
        while conn.execute("SELECT 1 FROM access_codes WHERE code=?", (code,)).fetchone():
            code = _make_code()
        conn.execute("INSERT INTO access_codes (code, created_at) VALUES (?,?)", (code, now))


def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS word_lists (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                words TEXT NOT NULL DEFAULT '[]',
                user_key TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS users (
                user_key TEXT PRIMARY KEY,
                loop_count INTEGER NOT NULL DEFAULT 0,
                is_unlimited INTEGER NOT NULL DEFAULT 0,
                code_used TEXT,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS access_codes (
                code TEXT PRIMARY KEY,
                used_by TEXT,
                used_at TEXT,
                created_at TEXT NOT NULL
            );
        """)
        # migrate existing DBs that don't have user_key column yet
        try:
            conn.execute("ALTER TABLE word_lists ADD COLUMN user_key TEXT NOT NULL DEFAULT ''")
        except Exception:
            pass
        count = conn.execute("SELECT COUNT(*) FROM access_codes").fetchone()[0]
        if count == 0:
            _seed_codes(conn, INITIAL_CODES)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Pronunciation Trainer API", version="2.0.0", lifespan=lifespan)

_origins = ["http://localhost:5173", "http://localhost:3000"]
if FRONTEND_URL:
    _origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ────────────────────────────────────────────────────────────────────

class WordList(BaseModel):
    name: str
    words: List[str]
    user_key: str


class WordListResponse(BaseModel):
    id: str
    name: str
    words: List[str]


class AddWordRequest(BaseModel):
    word: str


class UserStatusResponse(BaseModel):
    user_key: str
    loop_count: int
    is_unlimited: bool
    loops_remaining: Optional[int]


class LoopStartRequest(BaseModel):
    user_key: str


class LoopStartResponse(BaseModel):
    allowed: bool
    loop_count: int
    is_unlimited: bool
    loops_remaining: Optional[int]


class CodeValidateRequest(BaseModel):
    user_key: str
    code: str


class CodeInfo(BaseModel):
    code: str
    used_by: Optional[str]
    used_at: Optional[str]
    created_at: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def ensure_user(conn, user_key: str):
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        "INSERT OR IGNORE INTO users (user_key, loop_count, is_unlimited, created_at) VALUES (?,0,0,?)",
        (user_key, now)
    )
    return conn.execute("SELECT * FROM users WHERE user_key=?", (user_key,)).fetchone()


def check_admin(x_admin_key: str = Header(...)):
    if x_admin_key != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")


# ── Root ──────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Pronunciation Trainer API running"}


# ── Word lists ────────────────────────────────────────────────────────────────

@app.get("/api/lists", response_model=List[WordListResponse])
def get_lists(user_key: str = Query(...)):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, name, words FROM word_lists WHERE user_key=?", (user_key,)
        ).fetchall()
        return [{"id": r["id"], "name": r["name"], "words": json.loads(r["words"])} for r in rows]


@app.post("/api/lists", response_model=WordListResponse)
def create_list(data: WordList):
    list_id = str(uuid.uuid4())[:8]
    words = list(dict.fromkeys(w.strip().lower() for w in data.words if w.strip()))
    with get_db() as conn:
        conn.execute(
            "INSERT INTO word_lists (id, name, words, user_key) VALUES (?,?,?,?)",
            (list_id, data.name, json.dumps(words), data.user_key)
        )
    return {"id": list_id, "name": data.name, "words": words}


@app.get("/api/lists/{list_id}", response_model=WordListResponse)
def get_list(list_id: str, user_key: str = Query(...)):
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, name, words FROM word_lists WHERE id=? AND user_key=?", (list_id, user_key)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="List not found")
        return {"id": row["id"], "name": row["name"], "words": json.loads(row["words"])}


@app.delete("/api/lists/{list_id}")
def delete_list(list_id: str, user_key: str = Query(...)):
    with get_db() as conn:
        if not conn.execute(
            "SELECT 1 FROM word_lists WHERE id=? AND user_key=?", (list_id, user_key)
        ).fetchone():
            raise HTTPException(status_code=404, detail="List not found")
        conn.execute("DELETE FROM word_lists WHERE id=?", (list_id,))
    return {"message": "List deleted"}


@app.post("/api/lists/{list_id}/words")
def add_word(list_id: str, data: AddWordRequest, user_key: str = Query(...)):
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, name, words FROM word_lists WHERE id=? AND user_key=?", (list_id, user_key)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="List not found")
        word = data.word.strip().lower()
        if not word:
            raise HTTPException(status_code=400, detail="Word cannot be empty")
        words = json.loads(row["words"])
        if word not in words:
            words.append(word)
            conn.execute("UPDATE word_lists SET words=? WHERE id=?", (json.dumps(words), list_id))
        return {"id": list_id, "name": row["name"], "words": words}


@app.delete("/api/lists/{list_id}/words/{word}")
def remove_word(list_id: str, word: str, user_key: str = Query(...)):
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, name, words FROM word_lists WHERE id=? AND user_key=?", (list_id, user_key)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="List not found")
        words = [w for w in json.loads(row["words"]) if w != word.lower()]
        conn.execute("UPDATE word_lists SET words=? WHERE id=?", (json.dumps(words), list_id))
        return {"id": list_id, "name": row["name"], "words": words}


# ── Users & loops ─────────────────────────────────────────────────────────────

@app.get("/api/users/{user_key}", response_model=UserStatusResponse)
def get_user(user_key: str):
    with get_db() as conn:
        row = ensure_user(conn, user_key)
        remaining = None if row["is_unlimited"] else max(FREE_LOOP_LIMIT - row["loop_count"], 0)
        return {
            "user_key": user_key,
            "loop_count": row["loop_count"],
            "is_unlimited": bool(row["is_unlimited"]),
            "loops_remaining": remaining,
        }


@app.post("/api/loops/start", response_model=LoopStartResponse)
def loop_start(data: LoopStartRequest):
    with get_db() as conn:
        row = ensure_user(conn, data.user_key)
        is_unlimited = bool(row["is_unlimited"])
        count = row["loop_count"]

        if not is_unlimited and count >= FREE_LOOP_LIMIT:
            return {"allowed": False, "loop_count": count, "is_unlimited": False, "loops_remaining": 0}

        new_count = count + 1
        conn.execute("UPDATE users SET loop_count=? WHERE user_key=?", (new_count, data.user_key))
        remaining = None if is_unlimited else max(FREE_LOOP_LIMIT - new_count, 0)
        return {"allowed": True, "loop_count": new_count, "is_unlimited": is_unlimited, "loops_remaining": remaining}


@app.post("/api/codes/validate")
def validate_code(data: CodeValidateRequest):
    code = data.code.upper().strip()
    with get_db() as conn:
        code_row = conn.execute("SELECT * FROM access_codes WHERE code=?", (code,)).fetchone()
        if not code_row:
            raise HTTPException(status_code=400, detail="Código inválido")
        if code_row["used_by"]:
            raise HTTPException(status_code=400, detail="Este código ya fue usado")
        ensure_user(conn, data.user_key)
        now = datetime.now(timezone.utc).isoformat()
        conn.execute("UPDATE access_codes SET used_by=?, used_at=? WHERE code=?", (data.user_key, now, code))
        conn.execute("UPDATE users SET is_unlimited=1, code_used=? WHERE user_key=?", (code, data.user_key))
    return {"message": "Código activado. Acceso ilimitado desbloqueado.", "is_unlimited": True}


# ── Admin ─────────────────────────────────────────────────────────────────────

@app.get("/api/admin/codes", response_model=List[CodeInfo])
def admin_list_codes(admin=Depends(check_admin)):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT code, used_by, used_at, created_at FROM access_codes ORDER BY created_at"
        ).fetchall()
        return [dict(r) for r in rows]


@app.post("/api/admin/codes/generate")
def admin_generate_codes(count: int = 10, admin=Depends(check_admin)):
    with get_db() as conn:
        _seed_codes(conn, count)
        rows = conn.execute(
            "SELECT code FROM access_codes WHERE used_by IS NULL ORDER BY created_at DESC LIMIT ?", (count,)
        ).fetchall()
        return {"generated": count, "codes": [r["code"] for r in rows]}
