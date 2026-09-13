import { useEffect, useState } from 'react'
import { SessionContext } from './session-context'
import type { ReactNode } from 'react'
import { api, jsonRequest } from './api'
import type { Session } from './api'
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ user: null, csrfToken: '' })
  const [loading, setLoading] = useState(true),
    [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    api<Session>('/me', { signal: controller.signal })
      .then(setSession)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])
  const logout = async () => {
    await api('/auth/logout', jsonRequest('POST', {}, session.csrfToken))
    setSession({ user: null, csrfToken: '' })
  }
  return (
    <SessionContext.Provider value={{ ...session, loading, error, setSession, logout }}>
      {children}
    </SessionContext.Provider>
  )
}
