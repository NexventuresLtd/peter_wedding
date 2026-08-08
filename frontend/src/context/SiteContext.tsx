import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { api } from '../lib/api'
import { cssVarName, hexToRgbChannels } from '../lib/format'
import type { SiteConfig, Theme } from '../lib/types'

interface SiteContextValue {
  config: SiteConfig | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  /** Paint a theme without saving — used for live preview in the admin. */
  previewTheme: (theme: Theme | null) => void
}

const SiteContext = createContext<SiteContextValue | null>(null)

/** Write a theme into CSS custom properties on :root. */
function applyTheme(theme: Theme): void {
  const root = document.documentElement.style

  for (const [token, value] of Object.entries(theme.colors ?? {})) {
    if (typeof value !== 'string') continue
    // Colours land as RGB channels so Tailwind opacity modifiers work.
    // An unparseable value is skipped, leaving the previous colour in place
    // rather than blanking the site out mid-edit.
    const channels = hexToRgbChannels(value)
    if (channels) root.setProperty(cssVarName(token), channels)
  }
  for (const [token, value] of Object.entries(theme.fonts ?? {})) {
    if (typeof value === 'string') root.setProperty(`--f-${token}`, value)
  }
  for (const [token, value] of Object.entries(theme.radius ?? {})) {
    if (typeof value === 'string') root.setProperty(`--r-${token}`, value)
  }

  // Keep the mobile browser chrome in step with the palette.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta && theme.colors?.primary) meta.setAttribute('content', theme.colors.primary)
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Theme | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await api.site()
      setConfig(next)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the site.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // A preview theme wins over the saved one while the admin is editing.
  useEffect(() => {
    const active = preview ?? config?.theme
    if (active) applyTheme(active)
  }, [preview, config?.theme])

  useEffect(() => {
    const names = config?.content
    if (!names) return
    document.title = `${names.groomName} & ${names.brideName} — Our Wedding`
  }, [config?.content])

  const value = useMemo<SiteContextValue>(
    () => ({ config, loading, error, refresh, previewTheme: setPreview }),
    [config, loading, error, refresh],
  )

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export function useSite(): SiteContextValue {
  const context = useContext(SiteContext)
  if (!context) throw new Error('useSite must be used inside <SiteProvider>')
  return context
}
