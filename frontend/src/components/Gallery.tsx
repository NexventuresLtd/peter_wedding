import { useCallback, useEffect, useState } from 'react'

import { useLang } from '../context/LangContext'
import { api, assetUrl } from '../lib/api'
import { classNames, timeAgo } from '../lib/format'
import type { GalleryItem, UploadKind } from '../lib/types'
import {
  CameraIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  MessageIcon,
  PlayIcon,
  VideoIcon,
  XIcon,
} from './icons'
import { EmptyState, ErrorState, Skeleton, Spinner } from './ui'

const PER_PAGE = 24

interface GalleryProps {
  /** Cap the number of tiles — used for the teaser on the home page. */
  limit?: number
  showFilters?: boolean
  showLoadMore?: boolean
}

export function Gallery({
  limit,
  showFilters = true,
  showLoadMore = true,
}: GalleryProps) {
  const { t, lang } = useLang()
  const [items, setItems] = useState<GalleryItem[]>([])
  const [filter, setFilter] = useState<UploadKind | 'all'>('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      replace ? setLoading(true) : setLoadingMore(true)
      try {
        const result = await api.gallery({
          kind: filter === 'all' ? undefined : filter,
          page: nextPage,
          per_page: limit ?? PER_PAGE,
        })
        setItems((current) =>
          replace ? result.items : [...current, ...result.items],
        )
        setHasMore(limit ? false : result.has_more)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('somethingWrong'))
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [filter, limit, t],
  )

  useEffect(() => {
    setPage(1)
    void load(1, true)
  }, [load])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    void load(next, false)
  }

  const filters: { key: UploadKind | 'all'; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'photo', label: t('photos') },
    { key: 'video', label: t('videos') },
    { key: 'text', label: t('messages') },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: limit ?? 8 }).map((_, index) => (
          <Skeleton key={index} className="aspect-square w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => load(1, true)} retryLabel={t('retry')} />
  }

  return (
    <div>
      {showFilters && (
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {filters.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              className={classNames(
                'rounded-pill px-5 py-2 text-sm font-medium transition-all',
                filter === option.key
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'border border-hairline bg-surface text-ink-muted hover:border-accent hover:text-accent',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={<HeartIcon className="h-10 w-10" />}
          title={t('galleryEmpty')}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item, index) => (
            <GalleryTile
              key={item.id}
              item={item}
              onOpen={() => setLightboxIndex(index)}
              lang={lang}
            />
          ))}
        </div>
      )}

      {showLoadMore && hasMore && (
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="btn-outline"
          >
            {loadingMore && <Spinner className="h-4 w-4" />}
            {loadingMore ? t('loading') : t('loadMore')}
          </button>
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          items={items}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  )
}

function GalleryTile({
  item,
  onOpen,
  lang,
}: {
  item: GalleryItem
  onOpen: () => void
  lang: 'en' | 'rw'
}) {
  const { t } = useLang()

  // Written messages become a typographic card rather than a broken image tile.
  if (item.kind === 'text') {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="group flex aspect-square flex-col justify-between rounded-md border border-hairline bg-gradient-to-br from-surface to-surface-alt p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md sm:p-5"
      >
        <MessageIcon className="h-6 w-6 shrink-0 text-accent" />
        <p className="line-clamp-4 font-heading text-base leading-snug text-ink sm:text-lg">
          “{item.message}”
        </p>
        <p className="truncate text-xs text-ink-muted">
          — {item.uploader_name || t('anonymous')}
        </p>
      </button>
    )
  }

  const preview = assetUrl(item.thumb_url ?? item.file_url)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative aspect-square overflow-hidden rounded-md bg-surface-alt transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      {item.kind === 'video' ? (
        <>
          <video
            src={assetUrl(item.file_url) || undefined}
            className="h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white transition-colors group-hover:bg-black/35">
            <PlayIcon className="h-11 w-11 drop-shadow" />
          </span>
        </>
      ) : (
        <img
          src={preview}
          alt={item.message ?? ''}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}

      {item.uploader_name && (
        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8 text-left text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          {item.uploader_name} · {timeAgo(item.created_at, lang)}
        </span>
      )}
    </button>
  )
}

function Lightbox({
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
  const item = items[index]

  const go = useCallback(
    (delta: number) => {
      const next = (index + delta + items.length) % items.length
      onNavigate(next)
    },
    [index, items.length, onNavigate],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') go(1)
      if (event.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [go, onClose])

  if (!item) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/94 animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-5 py-4 text-white/80">
        <span className="text-sm tabular-nums">
          {index + 1} / {items.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-pill p-2 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={t('close')}
        >
          <XIcon className="h-6 w-6" />
        </button>
      </div>

      <div
        className="flex flex-1 items-center justify-center overflow-hidden px-4 pb-4"
        onClick={(event) => event.stopPropagation()}
      >
        {items.length > 1 && (
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-2 z-10 rounded-pill p-3 text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:left-6"
            aria-label="Previous"
          >
            <ChevronLeftIcon className="h-7 w-7" />
          </button>
        )}

        {item.kind === 'photo' && (
          <img
            src={assetUrl(item.file_url)}
            alt={item.message ?? ''}
            className="max-h-full max-w-full rounded-md object-contain"
          />
        )}
        {item.kind === 'video' && (
          <video
            src={assetUrl(item.file_url) || undefined}
            className="max-h-full max-w-full rounded-md"
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

        {items.length > 1 && (
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-2 z-10 rounded-pill p-3 text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:right-6"
            aria-label="Next"
          >
            <ChevronRightIcon className="h-7 w-7" />
          </button>
        )}
      </div>

      <div className="px-6 pb-8 text-center" onClick={(e) => e.stopPropagation()}>
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

/** Small counters shown above the gallery on the home page. */
export function GalleryStatsRow() {
  const { t } = useLang()
  const [stats, setStats] = useState<{
    photos: number
    videos: number
    messages: number
  } | null>(null)

  useEffect(() => {
    api.galleryStats().then(setStats).catch(() => setStats(null))
  }, [])

  if (!stats || stats.photos + stats.videos + stats.messages === 0) return null

  const entries = [
    { icon: CameraIcon, value: stats.photos, label: t('photos') },
    { icon: VideoIcon, value: stats.videos, label: t('videos') },
    { icon: MessageIcon, value: stats.messages, label: t('messages') },
  ]

  return (
    <div className="mb-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
      {entries.map(({ icon: Icon, value, label }) => (
        <div key={label} className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-accent" />
          <span className="font-body text-2xl font-semibold text-primary tabular-nums">
            {value}
          </span>
          <span className="text-sm text-ink-muted">{label}</span>
        </div>
      ))}
    </div>
  )
}
