import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, jsonRequest } from './api'
import type { Session } from './api'
type SessionState = Session & {
  loading: boolean
  error: string
  setSession: (s: Session) => void
  logout: () => Promise<void>
}
const Context = createContext<SessionState | null>(null)
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
    <Context.Provider value={{ ...session, loading, error, setSession, logout }}>
      {children}
    </Context.Provider>
  )
}
export function useSession() {
  const value = useContext(Context)
  if (!value) throw new Error('SessionProvider missing')
  return value
}
