import { useCallback, useEffect, useState } from 'react'

import {
  CameraIcon,
  CheckIcon,
  MessageIcon,
  TrashIcon,
  VideoIcon,
  XIcon,
} from '../../components/icons'
import { Badge, EmptyState, ErrorState, Modal, Skeleton, Spinner, useToast } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { classNames, formatBytes, formatDateTime } from '../../lib/format'
import type { AdminUpload, UploadKind, UploadStats, UploadStatus } from '../../lib/types'

const STATUS_TABS: { key: UploadStatus | 'all'; label: string }[] = [
  { key: 'pending', label: 'Awaiting review' },
  { key: 'approved', label: 'Published' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'Everything' },
]

const KIND_ICON: Record<UploadKind, typeof CameraIcon> = {
  photo: CameraIcon,
  video: VideoIcon,
  text: MessageIcon,
}

const STATUS_TONE: Record<UploadStatus, 'amber' | 'green' | 'red'> = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
}

export function Moderation() {
  const { can } = useAuth()
  const { notify } = useToast()

  const [items, setItems] = useState<AdminUpload[]>([])
  const [stats, setStats] = useState<UploadStats | null>(null)
  const [status, setStatus] = useState<UploadStatus | 'all'>('pending')
  const [kind, setKind] = useState<UploadKind | 'all'>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<AdminUpload | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AdminUpload | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [page, freshStats] = await Promise.all([
        api.adminUploads({
          status: status === 'all' ? undefined : status,
          kind: kind === 'all' ? undefined : kind,
          search: search.trim() || undefined,
          per_page: 100,
        }),
        api.adminStats(),
      ])
      setItems(page.items)
      setStats(freshStats)
      setSelected(new Set())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load uploads.')
    } finally {
      setLoading(false)
    }
  }, [status, kind, search])

  useEffect(() => {
    void load()
  }, [load])

  const review = async (item: AdminUpload, next: UploadStatus) => {
    setBusy(true)
    try {
      await api.reviewUpload(item.id, next)
      notify(next === 'approved' ? 'Published to the gallery.' : 'Rejected.')
      setPreview(null)
      await load()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Action failed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const bulk = async (next: UploadStatus) => {
    if (selected.size === 0) return
    setBusy(true)
    try {
      const result = await api.bulkReview([...selected], next)
      notify(`${result.updated} item${result.updated === 1 ? '' : 's'} ${next}.`)
      await load()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Action failed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (item: AdminUpload) => {
    setBusy(true)
    try {
      await api.deleteUpload(item.id)
      notify('Deleted permanently.')
      setConfirmDelete(null)
      setPreview(null)
      await load()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Delete failed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const toggle = (id: number) =>
    setSelected((current) => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const allSelected = items.length > 0 && selected.size === items.length

  return (
    <div>
      <header className="mb-7">
        <h1 className="text-2xl text-primary sm:text-3xl">Moderation</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Nothing reaches the public gallery until you approve it here.
        </p>
      </header>

      {stats && <StatsRow stats={stats} />}

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatus(tab.key)}
            className={classNames(
              'rounded-pill px-4 py-2 text-sm font-medium transition-colors',
              status === tab.key
                ? 'bg-primary text-on-primary'
                : 'border border-hairline bg-surface text-ink-muted hover:text-ink',
            )}
          >
            {tab.label}
            {tab.key === 'pending' && stats && stats.pending > 0 && (
              <span className="ml-2 rounded-pill bg-accent px-1.5 py-0.5 text-xs text-on-accent">
                {stats.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, phone or message…"
          className="field-input flex-1 py-2.5 text-sm"
        />
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as UploadKind | 'all')}
          className="field-input w-full py-2.5 text-sm sm:w-44"
        >
          <option value="all">All types</option>
          <option value="photo">Photos</option>
          <option value="video">Videos</option>
          <option value="text">Messages</option>
        </select>
      </div>

      {/* Bulk actions */}
      {items.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-hairline bg-surface px-4 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() =>
                setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)))
              }
              className="h-4 w-4 accent-[color:rgb(var(--c-primary))]"
            />
            Select all
          </label>

          {selected.size > 0 && (
            <>
              <span className="text-sm font-medium text-ink">{selected.size} selected</span>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => bulk('approved')}
                  disabled={busy}
                  className="btn bg-success px-4 py-2 text-xs text-white hover:brightness-110"
                >
                  <CheckIcon className="h-4 w-4" />
                  Publish
                </button>
                <button
                  type="button"
                  onClick={() => bulk('rejected')}
                  disabled={busy}
                  className="btn border border-hairline px-4 py-2 text-xs text-ink-muted hover:text-danger"
                >
                  <XIcon className="h-4 w-4" />
                  Reject
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-64 w-full" />
          ))}
        </div>
      )}

      {error && !loading && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="Nothing here"
          body={
            status === 'pending'
              ? 'Every contribution has been reviewed. Well done.'
              : 'No uploads match these filters.'
          }
        />
      )}

      {!loading && !error && items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <UploadCard
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onToggle={() => toggle(item.id)}
              onPreview={() => setPreview(item)}
              onApprove={() => review(item, 'approved')}
              onReject={() => review(item, 'rejected')}
              onDelete={can('admin') ? () => setConfirmDelete(item) : undefined}
              busy={busy}
            />
          ))}
        </div>
      )}

      <PreviewModal
        item={preview}
        onClose={() => setPreview(null)}
        onApprove={preview ? () => review(preview, 'approved') : undefined}
        onReject={preview ? () => review(preview, 'rejected') : undefined}
        busy={busy}
      />

      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)}>
        <div className="p-7">
          <h2 className="text-xl text-primary">Delete permanently?</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            This removes the record and the file from the server. It cannot be undone —
            rejecting instead keeps the file but hides it from the gallery.
          </p>
          <div className="mt-7 flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              className="btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => confirmDelete && remove(confirmDelete)}
              disabled={busy}
              className="btn-danger flex-1"
            >
              {busy && <Spinner className="h-4 w-4" />}
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function StatsRow({ stats }: { stats: UploadStats }) {
  const tiles = [
    { label: 'Awaiting review', value: stats.pending, accent: true },
    { label: 'Published', value: stats.approved },
    { label: 'Rejected', value: stats.rejected },
    { label: 'Photos', value: stats.photos },
    { label: 'Videos', value: stats.videos },
    { label: 'Messages', value: stats.texts },
  ]

  return (
    <div className="mb-7">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className={classNames(
              'rounded-md border bg-surface px-4 py-3',
              tile.accent && tile.value > 0
                ? 'border-accent/50 bg-accent/[0.06]'
                : 'border-hairline',
            )}
          >
            {/* Body font here, not the display serif — its numerals render "1"
                as a small-caps I, which is unreadable in a count. */}
            <p className="font-body text-2xl font-semibold text-primary tabular-nums">
              {tile.value}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">{tile.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-xs text-ink-muted">
        {formatBytes(stats.storage_used_bytes)} of media stored ·{' '}
        {formatBytes(stats.storage_free_bytes)} free on disk
      </p>
    </div>
  )
}

function UploadCard({
  item,
  selected,
  onToggle,
  onPreview,
  onApprove,
  onReject,
  onDelete,
  busy,
}: {
  item: AdminUpload
  selected: boolean
  onToggle: () => void
  onPreview: () => void
  onApprove: () => void
  onReject: () => void
  onDelete?: () => void
  busy: boolean
}) {
  const Icon = KIND_ICON[item.kind]

  return (
    <article
      className={classNames(
        'flex flex-col overflow-hidden rounded-md border bg-surface transition-shadow',
        selected ? 'border-accent shadow-md' : 'border-hairline hover:shadow-sm',
      )}
    >
      <div className="relative">
        <button
          type="button"
          onClick={onPreview}
          className="block h-44 w-full bg-surface-alt"
        >
          {item.kind === 'photo' && (
            <img
              src={item.thumb_url ?? item.file_url ?? ''}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          )}
          {item.kind === 'video' && (
            <video
              src={item.file_url ?? undefined}
              className="h-full w-full object-cover"
              muted
              preload="metadata"
            />
          )}
          {item.kind === 'text' && (
            <p className="line-clamp-5 px-4 py-4 text-left font-heading text-base leading-snug text-ink">
              “{item.message}”
            </p>
          )}
        </button>

        <label className="absolute left-2.5 top-2.5 cursor-pointer rounded-sm bg-white/90 p-1.5 shadow-sm backdrop-blur">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="h-4 w-4 accent-[color:rgb(var(--c-primary))] align-middle"
          />
        </label>

        <span className="absolute right-2.5 top-2.5">
          <Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <Icon className="h-4 w-4 shrink-0 text-accent" />
          <span className="truncate">{item.uploader_name || 'Anonymous guest'}</span>
        </div>

        {item.phone_number ? (
          <a
            href={`tel:${item.phone_number}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {item.phone_number}
          </a>
        ) : (
          <p className="text-sm italic text-ink-muted/70">No phone provided</p>
        )}

        {item.kind !== 'text' && item.message && (
          <p className="line-clamp-2 text-xs text-ink-muted">{item.message}</p>
        )}

        <p className="mt-auto pt-2 text-xs text-ink-muted">
          {formatDateTime(item.created_at)}
          {item.size_bytes ? ` · ${formatBytes(item.size_bytes)}` : ''}
        </p>

        <div className="flex gap-2 pt-1">
          {item.status !== 'approved' && (
            <button
              type="button"
              onClick={onApprove}
              disabled={busy}
              className="btn flex-1 bg-success px-3 py-2 text-xs text-white hover:brightness-110"
            >
              <CheckIcon className="h-4 w-4" />
              Publish
            </button>
          )}
          {item.status !== 'rejected' && (
            <button
              type="button"
              onClick={onReject}
              disabled={busy}
              className="btn flex-1 border border-hairline px-3 py-2 text-xs text-ink-muted hover:text-danger"
            >
              <XIcon className="h-4 w-4" />
              Reject
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="btn border border-hairline px-2.5 py-2 text-ink-muted hover:border-danger/40 hover:text-danger"
              aria-label="Delete permanently"
              title="Delete permanently"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function PreviewModal({
  item,
  onClose,
  onApprove,
  onReject,
  busy,
}: {
  item: AdminUpload | null
  onClose: () => void
  onApprove?: () => void
  onReject?: () => void
  busy: boolean
}) {
  if (!item) return null

  return (
    <Modal open onClose={onClose} wide>
      <div className="bg-black">
        {item.kind === 'photo' && (
          <img
            src={item.file_url ?? ''}
            alt=""
            className="max-h-[60vh] w-full object-contain"
          />
        )}
        {item.kind === 'video' && (
          <video
            src={item.file_url ?? undefined}
            className="max-h-[60vh] w-full"
            controls
            autoPlay
            playsInline
          />
        )}
        {item.kind === 'text' && (
          <blockquote className="px-8 py-14 text-center">
            <p className="font-heading text-2xl leading-relaxed text-white">
              “{item.message}”
            </p>
          </blockquote>
        )}
      </div>

      <div className="p-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Detail label="From" value={item.uploader_name || 'Anonymous guest'} />
          <Detail label="Phone" value={item.phone_number || 'Not provided'} />
          <Detail label="Uploaded" value={formatDateTime(item.created_at)} />
          <Detail label="Status" value={item.status} />
          {item.size_bytes && (
            <Detail label="Size" value={formatBytes(item.size_bytes)} />
          )}
          {item.width && (
            <Detail label="Dimensions" value={`${item.width} × ${item.height}`} />
          )}
          {item.ip_address && <Detail label="IP address" value={item.ip_address} />}
          {item.reviewed_by && <Detail label="Reviewed by" value={item.reviewed_by} />}
        </dl>

        {item.kind !== 'text' && item.message && (
          <p className="mt-5 rounded-md bg-surface-alt px-4 py-3 text-sm text-ink">
            {item.message}
          </p>
        )}

        <div className="mt-7 flex flex-wrap gap-3">
          {item.status !== 'approved' && onApprove && (
            <button
              type="button"
              onClick={onApprove}
              disabled={busy}
              className="btn flex-1 bg-success text-white hover:brightness-110"
            >
              <CheckIcon className="h-5 w-5" />
              Publish to gallery
            </button>
          )}
          {item.status !== 'rejected' && onReject && (
            <button
              type="button"
              onClick={onReject}
              disabled={busy}
              className="btn-outline flex-1"
            >
              <XIcon className="h-5 w-5" />
              Reject
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-ghost">
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-ink-muted">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-ink">{value}</dd>
    </div>
  )
}
