import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'

const STORAGE_KEY = 'pronounce_user_key'

function getOrCreateKey() {
  let key = localStorage.getItem(STORAGE_KEY)
  if (!key) {
    key = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, key)
  }
  return key
}

export function useUser() {
  const [userKey] = useState(getOrCreateKey)
  const [status, setStatus] = useState({ loop_count: 0, is_unlimited: false, loops_remaining: 50 })

  const refresh = useCallback(async () => {
    try {
      const data = await api.getUser(userKey)
      setStatus(data)
    } catch {
      // non-critical — keep last known status
    }
  }, [userKey])

  useEffect(() => { refresh() }, [refresh])

  return { userKey, status, refresh }
}
