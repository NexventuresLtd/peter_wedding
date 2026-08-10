import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'

import { useLang } from '../context/LangContext'
import { api, API_BASE, ApiError } from '../lib/api'
import { classNames, formatBytes } from '../lib/format'
import type { UploadKind } from '../lib/types'
import { CameraIcon, CheckIcon, MessageIcon, UploadIcon, VideoIcon, XIcon } from './icons'
import { Spinner } from './ui'

type Mode = Extract<UploadKind, 'photo' | 'video' | 'text'>

/** Guests at a wedding pick whole camera rolls; this keeps a batch sane. */
const MAX_FILES = 20

interface QueueItem {
  id: string
  file: File
  previewUrl: string
  isVideo: boolean
  status: 'queued' | 'uploading' | 'done' | 'failed'
  progress: number
  error?: string
}

let sequence = 0

export function UploadForm({ onSuccess }: { onSuccess?: () => void }) {
  const { t } = useLang()

  const [mode, setMode] = useState<Mode>('photo')
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [uploadsOpen, setUploadsOpen] = useState(true)

  const galleryInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  // Object URLs are revoked on unmount rather than per-render, so previews
  // survive re-renders while the batch uploads.
  const objectUrls = useRef<string[]>([])

  useEffect(() => {
    api
      .uploadStatus()
      .then((status) => setUploadsOpen(status.open))
      .catch(() => setUploadsOpen(true))
  }, [])

  useEffect(
    () => () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url))
    },
    [],
  )

  const isText = mode === 'text'
  const phoneRequired = isText

  const pending = queue.filter((item) => item.status !== 'done')
  const failed = queue.filter((item) => item.status === 'failed')
  const uploaded = queue.filter((item) => item.status === 'done')

  const reset = () => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url))
    objectUrls.current = []
    setQueue([])
    setMessage('')
    setError(null)
    setDone(false)
  }

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)

    setQueue((current) => {
      const room = MAX_FILES - current.length
      if (room <= 0) {
        setError(t('tooManyFiles'))
        return current
      }

      const incoming = [...files]
        // The same file picked twice adds nothing but confusion.
        .filter(
          (file) =>
            !current.some(
              (item) =>
                item.file.name === file.name &&
                item.file.size === file.size &&
                item.file.lastModified === file.lastModified,
            ),
        )

      if (incoming.length > room) setError(t('tooManyFiles'))

      const added = incoming.slice(0, room).map<QueueItem>((file) => {
        const previewUrl = URL.createObjectURL(file)
        objectUrls.current.push(previewUrl)
        return {
          id: `f${(sequence += 1)}`,
          file,
          previewUrl,
          isVideo: file.type.startsWith('video/'),
          status: 'queued',
          progress: 0,
        }
      })

      return [...current, ...added]
    })
  }

  const onPickFiles = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files)
    // Clearing lets the same file be re-picked after removing it.
    event.target.value = ''
  }

  const removeItem = (id: string) =>
    setQueue((current) => current.filter((item) => item.id !== id))

  const patch = (id: string, changes: Partial<QueueItem>) =>
    setQueue((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    )

  /**
   * Upload one file per request, one at a time.
   *
   * Sequential rather than parallel: a phone on venue wi-fi gets a usable
   * progress bar instead of several stalled transfers, and one rejected file
   * (too large, wrong type) no longer takes the whole batch down with it.
   */
  const uploadBatch = async (items: QueueItem[]) => {
    let anySucceeded = false

    for (const item of items) {
      patch(item.id, { status: 'uploading', progress: 0, error: undefined })
      try {
        const form = new FormData()
        form.append('file', item.file)
        if (phone.trim()) form.append('phone_number', phone.trim())
        if (name.trim()) form.append('uploader_name', name.trim())
        if (message.trim()) form.append('message', message.trim())

        await uploadWithProgress(form, (percent) => patch(item.id, { progress: percent }))
        patch(item.id, { status: 'done', progress: 100 })
        anySucceeded = true
      } catch (err) {
        patch(item.id, {
          status: 'failed',
          progress: 0,
          error: err instanceof ApiError ? err.message : t('somethingWrong'),
        })
      }
    }

    return anySucceeded
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (isText) {
      if (message.trim().length < 2) return setError(t('messageTooShort'))
      if (!phone.trim()) return setError(t('phoneMissing'))

      setSubmitting(true)
      try {
        await api.uploadText({
          message: message.trim(),
          phone_number: phone.trim(),
          uploader_name: name.trim() || undefined,
        })
        setDone(true)
        onSuccess?.()
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t('somethingWrong'))
      } finally {
        setSubmitting(false)
      }
      return
    }

    const toSend = queue.filter((item) => item.status !== 'done')
    if (toSend.length === 0) return setError(t('selectFileFirst'))

    setSubmitting(true)
    const anySucceeded = await uploadBatch(toSend)
    setSubmitting(false)

    if (anySucceeded) onSuccess?.()
    // Only leave the form once everything has landed; otherwise the failures
    // stay on screen so they can be retried.
    setQueue((current) => {
      if (current.every((item) => item.status === 'done')) setDone(true)
      return current
    })
  }

  const retryFailed = async () => {
    setSubmitting(true)
    await uploadBatch(queue.filter((item) => item.status === 'failed'))
    setSubmitting(false)
    setQueue((current) => {
      if (current.every((item) => item.status === 'done')) setDone(true)
      return current
    })
  }

  if (!uploadsOpen) {
    return (
      <div className="card p-8 text-center">
        <p className="font-heading text-xl text-primary">{t('uploadsClosed')}</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="card animate-fade-up p-8 text-center sm:p-10">
        <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-pill bg-success/12 text-success">
          <CheckIcon className="h-9 w-9" />
        </span>
        <h3 className="text-2xl text-primary">{t('successTitle')}</h3>
        {uploaded.length > 1 && (
          <p className="mt-2 text-sm font-medium text-success">
            {uploaded.length} {t('filesSelected')}
          </p>
        )}
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
          {t('successBody')}
        </p>
        <button type="button" onClick={reset} className="btn-outline mt-7">
          {t('sendAnother')}
        </button>
      </div>
    )
  }

  const modes: { key: Mode; label: string; icon: typeof CameraIcon }[] = [
    { key: 'photo', label: t('uploadPhoto'), icon: CameraIcon },
    { key: 'video', label: t('uploadVideo'), icon: VideoIcon },
    { key: 'text', label: t('uploadText'), icon: MessageIcon },
  ]

  return (
    <form onSubmit={handleSubmit} className="card overflow-hidden">
      {/* Mode switcher */}
      <div className="grid grid-cols-3 border-b border-hairline">
        {modes.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              // Photo and video share one queue, so only leaving media clears it.
              if (key === 'text') reset()
              setMode(key)
              setError(null)
            }}
            className={classNames(
              'flex flex-col items-center gap-1.5 py-4 text-sm font-medium transition-colors',
              mode === key
                ? 'bg-primary/6 text-primary shadow-[inset_0_-2px_0_0_rgb(var(--c-accent))]'
                : 'text-ink-muted hover:bg-ink/[0.03] hover:text-ink',
            )}
            aria-pressed={mode === key}
          >
            <Icon className="h-6 w-6" />
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-5 p-5 sm:p-7">
        {!isText && (
          <div>
            {queue.length === 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {/* `capture` opens the camera directly on a phone; on desktop
                    the browser falls back to the normal file picker. */}
                <button
                  type="button"
                  onClick={() => cameraInput.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-accent/45 bg-accent/[0.06] px-4 py-8 text-primary transition-colors hover:border-accent hover:bg-accent/10"
                >
                  {mode === 'video' ? (
                    <VideoIcon className="h-8 w-8 text-accent" />
                  ) : (
                    <CameraIcon className="h-8 w-8 text-accent" />
                  )}
                  <span className="text-sm font-semibold">
                    {mode === 'video' ? t('recordVideo') : t('takePhoto')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => galleryInput.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-hairline px-4 py-8 text-ink-muted transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <UploadIcon className="h-8 w-8" />
                  <span className="text-sm font-semibold">{t('chooseFile')}</span>
                </button>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-ink">
                    {pending.length > 0
                      ? `${pending.length} ${t('filesSelected')}`
                      : `${uploaded.length} ✓`}
                  </p>
                  <button
                    type="button"
                    onClick={() => galleryInput.current?.click()}
                    disabled={submitting || queue.length >= MAX_FILES}
                    className="btn-ghost text-xs"
                  >
                    <UploadIcon className="h-4 w-4" />
                    {t('addMore')}
                  </button>
                </div>

                <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                  {queue.map((item) => (
                    <QueueTile
                      key={item.id}
                      item={item}
                      onRemove={() => removeItem(item.id)}
                      removable={!submitting && item.status !== 'done'}
                      removeLabel={t('removeFile')}
                    />
                  ))}
                </ul>
              </>
            )}

            <input
              ref={cameraInput}
              type="file"
              accept={mode === 'video' ? 'video/*' : 'image/*'}
              capture="environment"
              onChange={onPickFiles}
              className="sr-only"
              tabIndex={-1}
            />
            <input
              ref={galleryInput}
              type="file"
              accept={mode === 'video' ? 'video/*' : 'image/*'}
              multiple
              onChange={onPickFiles}
              className="sr-only"
              tabIndex={-1}
            />
          </div>
        )}

        {isText ? (
          <div>
            <label htmlFor="message" className="field-label">
              {t('message')}
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              maxLength={2000}
              placeholder={t('messagePlaceholder')}
              className="field-input resize-y"
              required
            />
            <p className="field-hint text-right">{message.length}/2000</p>
          </div>
        ) : (
          <div>
            <label htmlFor="caption" className="field-label">
              {t('caption')}
            </label>
            <input
              id="caption"
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={200}
              className="field-input"
            />
            {queue.length > 1 && (
              <p className="field-hint">{t('batchAppliesToAll')}</p>
            )}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="field-label">
              {t('yourNameOptional')}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              maxLength={150}
              className="field-input"
            />
          </div>

          <div>
            <label htmlFor="phone" className="field-label">
              {phoneRequired ? t('phoneRequired') : t('phoneOptional')}
              {phoneRequired && <span className="ml-1 text-danger">*</span>}
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="0788 123 456"
              className="field-input"
              required={phoneRequired}
            />
            <p className="field-hint">
              {phoneRequired ? t('phoneHelpText') : t('phoneHelpMedia')}
            </p>
          </div>
        </div>

        {error && (
          <p
            className="rounded-md border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger"
            role="alert"
          >
            {error}
          </p>
        )}

        {failed.length > 0 && !submitting && (
          <div className="rounded-md border border-danger/25 bg-danger/5 px-4 py-3">
            <p className="text-sm text-danger">
              {t('someFailed')} ({failed.length})
            </p>
            <button
              type="button"
              onClick={retryFailed}
              className="btn-ghost mt-1 text-sm text-danger"
            >
              {t('retryFailed')}
            </button>
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? <Spinner className="h-5 w-5" /> : <UploadIcon className="h-5 w-5" />}
          {submitting
            ? `${t('uploadingProgress')} ${uploaded.length + 1}/${queue.length || 1}…`
            : pending.length > 1
              ? `${t('sendCount')} ${pending.length}`
              : t('send')}
        </button>
      </div>
    </form>
  )
}

function QueueTile({
  item,
  onRemove,
  removable,
  removeLabel,
}: {
  item: QueueItem
  onRemove: () => void
  removable: boolean
  removeLabel: string
}) {
  return (
    <li
      className={classNames(
        'relative aspect-square overflow-hidden rounded-md border bg-surface-alt',
        item.status === 'failed' ? 'border-danger/50' : 'border-hairline',
      )}
    >
      {item.isVideo ? (
        <video src={item.previewUrl} className="h-full w-full object-cover" muted playsInline />
      ) : (
        <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
      )}

      {/* Uploading: dim the tile and fill a bar along the bottom. */}
      {item.status === 'uploading' && (
        <div className="absolute inset-0 flex flex-col justify-end bg-black/45">
          <p className="pb-1 text-center text-xs font-semibold text-white tabular-nums">
            {item.progress}%
          </p>
          <div className="h-1 w-full bg-white/25">
            <div
              className="h-full bg-accent transition-[width] duration-200"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </div>
      )}

      {item.status === 'done' && (
        <span className="absolute inset-0 flex items-center justify-center bg-success/70 text-white">
          <CheckIcon className="h-8 w-8" />
        </span>
      )}

      {item.status === 'failed' && (
        <span
          className="absolute inset-0 flex items-center justify-center bg-danger/70 p-1 text-center text-[10px] font-medium leading-tight text-white"
          title={item.error}
        >
          {item.error}
        </span>
      )}

      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-1 top-1 rounded-pill bg-black/55 p-1 text-white transition-colors hover:bg-danger"
          aria-label={`${removeLabel} ${item.file.name}`}
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      )}

      {item.status === 'queued' && (
        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-[10px] text-white">
          {formatBytes(item.file.size)}
        </span>
      )}
    </li>
  )
}

/**
 * fetch() cannot report upload progress, so media goes through XHR — on a phone
 * over mobile data a large video would otherwise look frozen.
 */
function uploadWithProgress(
  form: FormData,
  onProgress: (percent: number) => void,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/uploads/media`)

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText || '{}'))
        return
      }
      let detail = `Upload failed (${xhr.status})`
      try {
        const body = JSON.parse(xhr.responseText)
        if (typeof body.detail === 'string') detail = body.detail
        else if (Array.isArray(body.detail)) detail = body.detail[0]?.msg ?? detail
      } catch {
        /* keep the generic message */
      }
      reject(new ApiError(detail, xhr.status))
    })

    xhr.addEventListener('error', () =>
      reject(new ApiError('Network error — check your connection and try again.', 0)),
    )
    xhr.addEventListener('abort', () => reject(new ApiError('Upload cancelled.', 0)))

    xhr.send(form)
  })
}
