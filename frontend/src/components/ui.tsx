import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { classNames } from '../lib/format'

// ------------------------------------------------------------------ ornaments

/** Gold rule with a centred diamond — the section separator used throughout. */
export function Ornament({ className }: { className?: string }) {
  return (
    <div className={classNames('divider-ornament', className)} aria-hidden="true">
      <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0">
        <path d="M5 0l5 5-5 5-5-5z" fill="currentColor" />
      </svg>
    </div>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  align?: 'center' | 'left'
}) {
  const centred = align === 'center'
  return (
    <header className={classNames('mb-10', centred && 'text-center')}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="text-3xl leading-tight text-primary sm:text-4xl md:text-[2.75rem]">
        {title}
      </h2>
      <Ornament className={classNames('mt-5', !centred && 'justify-start')} />
      {subtitle && (
        <p
          className={classNames(
            'mt-5 text-base leading-relaxed text-ink-muted',
            centred && 'mx-auto max-w-2xl',
          )}
        >
          {subtitle}
        </p>
      )}
    </header>
  )
}

// --------------------------------------------------------------------- states

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={classNames('animate-spin', className ?? 'h-5 w-5')}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-hairline bg-surface-alt/50 px-6 py-16 text-center">
      {icon && <div className="mb-4 text-accent">{icon}</div>}
      <p className="font-heading text-xl text-primary">{title}</p>
      {body && <p className="mt-2 max-w-sm text-sm text-ink-muted">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry, retryLabel = 'Try again' }: {
  message: string
  onRetry?: () => void
  retryLabel?: string
}) {
  return (
    <div className="rounded-md border border-danger/25 bg-danger/5 px-5 py-4 text-center">
      <p className="text-sm text-danger">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost mt-2 text-danger">
          {retryLabel}
        </button>
      )}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={classNames('skeleton', className)} aria-hidden="true" />
}

// --------------------------------------------------------------------- badges

const BADGE_TONES = {
  neutral: 'bg-ink/8 text-ink-muted',
  gold: 'bg-accent/15 text-[color:rgb(var(--c-ink))]',
  green: 'bg-success/12 text-success',
  red: 'bg-danger/10 text-danger',
  amber: 'bg-amber-500/15 text-amber-700',
} as const

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: keyof typeof BADGE_TONES
}) {
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-semibold',
        BADGE_TONES[tone],
      )}
    >
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------- modal

export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  labelledBy?: string
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // Stop the page behind the dialog from scrolling.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={onClose}
    >
      <div
        className={classNames(
          'max-h-[92vh] w-full overflow-y-auto rounded-t-lg bg-surface shadow-2xl sm:rounded-lg',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

// --------------------------------------------------------------------- toasts

interface Toast {
  id: number
  message: string
  tone: 'success' | 'error'
}

interface ToastContextValue {
  notify: (message: string, tone?: Toast['tone']) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, message, tone }])
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 4200)
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={classNames(
              'pointer-events-auto max-w-md rounded-pill px-5 py-3 text-sm font-medium text-white shadow-lg animate-fade-up',
              toast.tone === 'success' ? 'bg-primary' : 'bg-danger',
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}
