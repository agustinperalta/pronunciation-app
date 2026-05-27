from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uuid

app = FastAPI(title="Pronunciation Trainer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store (replace with DB in production)
word_lists: dict = {}


class WordList(BaseModel):
    name: str
    words: List[str]


class WordListResponse(BaseModel):
    id: str
    name: str
    words: List[str]


class AddWordRequest(BaseModel):
    word: str


@app.get("/")
def root():
    return {"message": "Pronunciation Trainer API running"}


@app.get("/api/lists", response_model=List[WordListResponse])
def get_lists():
    return [{"id": k, **v} for k, v in word_lists.items()]


@app.post("/api/lists", response_model=WordListResponse)
def create_list(data: WordList):
    list_id = str(uuid.uuid4())[:8]
    # Deduplicate and lowercase
    words = list(dict.fromkeys(w.strip().lower() for w in data.words if w.strip()))
    word_lists[list_id] = {"name": data.name, "words": words}
    return {"id": list_id, "name": data.name, "words": words}


@app.get("/api/lists/{list_id}", response_model=WordListResponse)
def get_list(list_id: str):
    if list_id not in word_lists:
        raise HTTPException(status_code=404, detail="List not found")
    return {"id": list_id, **word_lists[list_id]}


@app.delete("/api/lists/{list_id}")
def delete_list(list_id: str):
    if list_id not in word_lists:
        raise HTTPException(status_code=404, detail="List not found")
    del word_lists[list_id]
    return {"message": "List deleted"}


@app.post("/api/lists/{list_id}/words")
def add_word(list_id: str, data: AddWordRequest):
    if list_id not in word_lists:
        raise HTTPException(status_code=404, detail="List not found")
    word = data.word.strip().lower()
    if not word:
        raise HTTPException(status_code=400, detail="Word cannot be empty")
    if word not in word_lists[list_id]["words"]:
        word_lists[list_id]["words"].append(word)
    return {"id": list_id, **word_lists[list_id]}


@app.delete("/api/lists/{list_id}/words/{word}")
def remove_word(list_id: str, word: str):
    if list_id not in word_lists:
        raise HTTPException(status_code=404, detail="List not found")
    word_lists[list_id]["words"] = [
        w for w in word_lists[list_id]["words"] if w != word.lower()
    ]
    return {"id": list_id, **word_lists[list_id]}
