const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const api = {
  getLists: () => request('/api/lists'),
  createList: (name, words) =>
    request('/api/lists', { method: 'POST', body: JSON.stringify({ name, words }) }),
  deleteList: (id) => request(`/api/lists/${id}`, { method: 'DELETE' }),
  addWord: (id, word) =>
    request(`/api/lists/${id}/words`, { method: 'POST', body: JSON.stringify({ word }) }),
  removeWord: (id, word) =>
    request(`/api/lists/${id}/words/${encodeURIComponent(word)}`, { method: 'DELETE' }),
}
