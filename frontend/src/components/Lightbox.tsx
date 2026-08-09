import { useCallback, useEffect, useRef, useState } from 'react'

import { useLang } from '../context/LangContext'
import { assetUrl } from '../lib/api'
import { classNames, timeAgo } from '../lib/format'
import { downloadItem, shareItem } from '../lib/share'
import type { GalleryItem } from '../lib/types'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CollapseIcon,
  DownloadIcon,
  ExpandIcon,
  MessageIcon,
  ShareIcon,
  XIcon,
} from './icons'
import { Spinner, useToast } from './ui'

/** Below this drag distance a swipe is treated as a tap, not a navigation. */
const SWIPE_THRESHOLD = 60

export function Lightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: GalleryItem[]
  index: number
  onClose: () => void
  onNavigate: (index: number) => void
}) {
  const { t, lang } = useLang()
  const { notify } = useToast()

  const containerRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  const [dragX, setDragX] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [animating, setAnimating] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [busy, setBusy] = useState<'download' | 'share' | null>(null)

  const item = items[index]

  const go = useCallback(
    (delta: 1 | -1) => {
      if (items.length < 2) return
      setDirection(delta)
      setAnimating(true)
      onNavigate((index + delta + items.length) % items.length)
    },
    [index, items.length, onNavigate],
  )

  // Re-trigger the slide animation each time the visible item changes.
  useEffect(() => {
    setAnimating(true)
    const timer = setTimeout(() => setAnimating(false), 320)
    return () => clearTimeout(timer)
  }, [index])

  // Keyboard: arrows navigate, Escape closes, F toggles fullscreen.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement) onClose()
      if (event.key === 'ArrowRight') go(1)
      if (event.key === 'ArrowLeft') go(-1)
      if (event.key.toLowerCase() === 'f') void toggleFullscreen()
    }
    document.addEventListener('keydown', onKey)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
    // toggleFullscreen is stable enough for this handler's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go, onClose])

  // Track fullscreen state, including the user leaving it with Escape or F11.
  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  // Leaving fullscreen when the lightbox unmounts avoids stranding the page
  // in a fullscreen state with nothing in it.
  useEffect(
    () => () => {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    },
    [],
  )

  async function toggleFullscreen() {
    const element = containerRef.current
    if (!element) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await element.requestFullscreen()
      }
    } catch {
      notify(t('somethingWrong'), 'error')
    }
  }

  const handleDownload = async () => {
    if (!item?.file_url) return
    setBusy('download')
    try {
      await downloadItem(item)
      notify(lang === 'rw' ? 'Byakuwe neza.' : 'Saved to your device.')
    } catch (error) {
      notify(error instanceof Error ? error.message : t('somethingWrong'), 'error')
    } finally {
      setBusy(null)
    }
  }

  const handleShare = async () => {
    if (!item) return
    setBusy('share')
    try {
      const outcome = await shareItem(item, {
        text: item.message ?? undefined,
      })
      if (outcome === 'copied') {
        notify(lang === 'rw' ? 'Umurongo wakoporowe.' : 'Link copied to clipboard.')
      } else if (outcome === 'shared') {
        notify(lang === 'rw' ? 'Byasangijwe.' : 'Shared.')
      }
      // 'cancelled' is the user's own choice — no toast.
    } catch (error) {
      notify(error instanceof Error ? error.message : t('somethingWrong'), 'error')
    } finally {
      setBusy(null)
    }
  }

  // ------------------------------------------------------------- swipe

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    dragStart.current = { x: event.clientX, y: event.clientY }
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragStart.current) return
    const dx = event.clientX - dragStart.current.x
    const dy = event.clientY - dragStart.current.y
    // Ignore mostly-vertical gestures so scrolling a caption still works.
    if (Math.abs(dy) > Math.abs(dx)) return
    setDragX(dx)
  }

  const onPointerUp = () => {
    if (!dragStart.current) return
    if (Math.abs(dragX) > SWIPE_THRESHOLD) go(dragX < 0 ? 1 : -1)
    dragStart.current = null
    setDragX(0)
  }

  if (!item) return null

  const canSaveOrShare = item.kind !== 'text' && Boolean(item.file_url)

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 animate-fade-in backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('navGallery')}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 text-white/80 sm:px-6">
        <span className="text-sm tabular-nums">
          {index + 1} / {items.length}
        </span>

        <div className="flex items-center gap-1">
          {canSaveOrShare && (
            <>
              <ToolbarButton
                onClick={handleDownload}
                label={lang === 'rw' ? 'Kuramo' : 'Download'}
                busy={busy === 'download'}
              >
                <DownloadIcon className="h-5 w-5" />
              </ToolbarButton>
              <ToolbarButton
                onClick={handleShare}
                label={lang === 'rw' ? 'Sangiza' : 'Share'}
                busy={busy === 'share'}
              >
                <ShareIcon className="h-5 w-5" />
              </ToolbarButton>
            </>
          )}
          <ToolbarButton
            onClick={toggleFullscreen}
            label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? (
              <CollapseIcon className="h-5 w-5" />
            ) : (
              <ExpandIcon className="h-5 w-5" />
            )}
          </ToolbarButton>
          <ToolbarButton onClick={onClose} label={t('close')}>
            <XIcon className="h-6 w-6" />
          </ToolbarButton>
        </div>
      </div>

      {/* Stage */}
      <div
        className="relative flex flex-1 select-none items-center justify-center overflow-hidden px-4 pb-4 touch-pan-y"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {items.length > 1 && (
          <NavArrow side="left" onClick={() => go(-1)}>
            <ChevronLeftIcon className="h-7 w-7" />
          </NavArrow>
        )}

        <div
          key={item.id}
          className={classNames(
            'flex max-h-full max-w-full items-center justify-center',
            animating && (direction === 1 ? 'animate-slide-in-right' : 'animate-slide-in-left'),
          )}
          style={
            dragX
              ? { transform: `translateX(${dragX}px)`, opacity: 1 - Math.abs(dragX) / 600 }
              : undefined
          }
        >
          {item.kind === 'photo' && (
            <img
              src={assetUrl(item.file_url)}
              alt={item.message ?? ''}
              draggable={false}
              className="max-h-[72vh] max-w-full rounded-md object-contain shadow-2xl"
            />
          )}

          {item.kind === 'video' && (
            <video
              src={assetUrl(item.file_url) || undefined}
              className="max-h-[72vh] max-w-full rounded-md shadow-2xl"
              controls
              autoPlay
              playsInline
            />
          )}

          {item.kind === 'text' && (
            <blockquote className="max-w-2xl px-6 text-center">
              <MessageIcon className="mx-auto mb-6 h-9 w-9 text-accent" />
              <p className="font-heading text-2xl leading-relaxed text-white sm:text-3xl">
                “{item.message}”
              </p>
            </blockquote>
          )}
        </div>

        {items.length > 1 && (
          <NavArrow side="right" onClick={() => go(1)}>
            <ChevronRightIcon className="h-7 w-7" />
          </NavArrow>
        )}
      </div>

      {/* Caption */}
      <div className="px-6 pb-8 text-center">
        {item.kind !== 'text' && item.message && (
          <p className="mx-auto mb-2 max-w-xl text-sm text-white/90">{item.message}</p>
        )}
        <p className="text-xs text-white/50">
          {item.uploader_name ? `${t('by')} ${item.uploader_name} · ` : ''}
          {timeAgo(item.created_at, lang)}
        </p>
      </div>
    </div>
  )
}

function ToolbarButton({
  onClick,
  label,
  busy = false,
  children,
}: {
  onClick: () => void
  label: string
  busy?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="rounded-pill p-2.5 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-60"
      aria-label={label}
      title={label}
    >
      {busy ? <Spinner className="h-5 w-5" /> : children}
    </button>
  )
}

function NavArrow({
  side,
  onClick,
  children,
}: {
  side: 'left' | 'right'
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        'absolute z-10 rounded-pill bg-black/30 p-3 text-white/70 backdrop-blur-sm transition-all hover:bg-black/50 hover:text-white',
        side === 'left' ? 'left-2 sm:left-6' : 'right-2 sm:right-6',
      )}
      aria-label={side === 'left' ? 'Previous' : 'Next'}
    >
      {children}
    </button>
  )
}
