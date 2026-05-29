const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function userKey() {
  return localStorage.getItem('pronounce_user_key') || ''
}

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
  getLists: () => request(`/api/lists?user_key=${userKey()}`),
  createList: (name, words) =>
    request('/api/lists', { method: 'POST', body: JSON.stringify({ name, words, user_key: userKey() }) }),
  deleteList: (id) => request(`/api/lists/${id}?user_key=${userKey()}`, { method: 'DELETE' }),
  addWord: (id, word) =>
    request(`/api/lists/${id}/words?user_key=${userKey()}`, { method: 'POST', body: JSON.stringify({ word }) }),
  removeWord: (id, word) =>
    request(`/api/lists/${id}/words/${encodeURIComponent(word)}?user_key=${userKey()}`, { method: 'DELETE' }),
  getUser: (userKey) => request(`/api/users/${userKey}`),
  startLoop: (userKey) =>
    request('/api/loops/start', { method: 'POST', body: JSON.stringify({ user_key: userKey }) }),
  validateCode: (userKey, code) =>
    request('/api/codes/validate', { method: 'POST', body: JSON.stringify({ user_key: userKey, code }) }),
}
