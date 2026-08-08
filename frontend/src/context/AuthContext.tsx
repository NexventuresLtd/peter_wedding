import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { api, tokenStore } from '../lib/api'
import type { AdminRole, AdminUser } from '../lib/types'

const ROLE_RANK: Record<AdminRole, number> = {
  moderator: 1,
  admin: 2,
  superadmin: 3,
}

interface AuthContextValue {
  user: AdminUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  /** True when the signed-in admin holds at least `role`. */
  can: (role: AdminRole) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  const loadSession = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      setUser(await api.me())
    } catch {
      // Expired or invalid token — api.ts has already cleared it.
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSession()
  }, [loadSession])

  // The API client fires this when any authenticated call returns 401.
  useEffect(() => {
    const onUnauthorised = () => setUser(null)
    window.addEventListener('pw:unauthorised', onUnauthorised)
    return () => window.removeEventListener('pw:unauthorised', onUnauthorised)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    await api.login(email, password)
    setUser(await api.me())
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  const can = useCallback(
    (role: AdminRole) => (user ? ROLE_RANK[user.role] >= ROLE_RANK[role] : false),
    [user],
  )

  const value = useMemo(
    () => ({ user, loading, login, logout, can }),
    [user, loading, login, logout, can],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
