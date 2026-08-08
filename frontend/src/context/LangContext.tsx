import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { strings } from '../i18n/strings'
import type { Lang } from '../lib/types'

const STORAGE_KEY = 'pw_lang'

interface LangContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  toggle: () => void
  /** UI string lookup for chrome that isn't admin-editable. */
  t: (key: keyof typeof strings.en) => string
}

const LangContext = createContext<LangContextValue | null>(null)

function initialLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'rw') return stored
  // Kinyarwanda speakers land on their own language by default.
  return navigator.language?.toLowerCase().startsWith('rw') ? 'rw' : 'en'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang)
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => setLangState(next), [])
  const toggle = useCallback(
    () => setLangState((current) => (current === 'en' ? 'rw' : 'en')),
    [],
  )
  const t = useCallback((key: keyof typeof strings.en) => strings[lang][key], [lang])

  const value = useMemo(() => ({ lang, setLang, toggle, t }), [lang, setLang, toggle, t])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang(): LangContextValue {
  const context = useContext(LangContext)
  if (!context) throw new Error('useLang must be used inside <LangProvider>')
  return context
}
