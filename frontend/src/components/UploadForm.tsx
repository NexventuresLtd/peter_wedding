import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'

import { useLang } from '../context/LangContext'
import { api, API_BASE, ApiError } from '../lib/api'
import { classNames, formatBytes } from '../lib/format'
import type { UploadKind } from '../lib/types'
import { CameraIcon, CheckIcon, MessageIcon, UploadIcon, VideoIcon, XIcon } from './icons'
import { Spinner } from './ui'

type Mode = Extract<UploadKind, 'photo' | 'video' | 'text'>

export function UploadForm({ onSuccess }: { onSuccess?: () => void }) {
  const { t } = useLang()

  const [mode, setMode] = useState<Mode>('photo')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [uploadsOpen, setUploadsOpen] = useState(true)

  const galleryInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api
      .uploadStatus()
      .then((status) => setUploadsOpen(status.open))
      .catch(() => setUploadsOpen(true))
  }, [])

  // Object URLs must be revoked or the browser leaks the whole file.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const phoneRequired = mode === 'text'

  const reset = () => {
    setFile(null)
    setMessage('')
    setError(null)
    setDone(false)
    setProgress(0)
  }

  const onPickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null
    setFile(picked)
    setError(null)
    // Clearing lets the same file be re-picked after a failed attempt.
    event.target.value = ''
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (mode === 'text') {
      if (message.trim().length < 2) return setError(t('messageTooShort'))
      if (!phone.trim()) return setError(t('phoneMissing'))
    } else if (!file) {
      return setError(t('selectFileFirst'))
    }

    setSubmitting(true)
    try {
      if (mode === 'text') {
        await api.uploadText({
          message: message.trim(),
          phone_number: phone.trim(),
          uploader_name: name.trim() || undefined,
        })
      } else {
        const form = new FormData()
        form.append('file', file as File)
        if (phone.trim()) form.append('phone_number', phone.trim())
        if (name.trim()) form.append('uploader_name', name.trim())
        if (message.trim()) form.append('message', message.trim())
        await uploadWithProgress(form, setProgress)
      }
      setDone(true)
      onSuccess?.()
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('somethingWrong'),
      )
    } finally {
      setSubmitting(false)
      setProgress(0)
    }
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
              setMode(key)
              setFile(null)
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
        {mode !== 'text' && (
          <div>
            {file ? (
              <FilePreview
                file={file}
                previewUrl={previewUrl}
                isVideo={mode === 'video'}
                onClear={() => setFile(null)}
              />
            ) : (
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
            )}

            <input
              ref={cameraInput}
              type="file"
              accept={mode === 'video' ? 'video/*' : 'image/*'}
              capture="environment"
              onChange={onPickFile}
              className="sr-only"
              tabIndex={-1}
            />
            <input
              ref={galleryInput}
              type="file"
              accept={mode === 'video' ? 'video/*' : 'image/*'}
              onChange={onPickFile}
              className="sr-only"
              tabIndex={-1}
            />
          </div>
        )}

        {mode === 'text' ? (
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

        {submitting && progress > 0 && (
          <div
            className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-alt"
            role="progressbar"
            aria-valuenow={progress}
          >
            <div
              className="h-full rounded-pill bg-accent transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? <Spinner className="h-5 w-5" /> : <UploadIcon className="h-5 w-5" />}
          {submitting ? t('sending') : t('send')}
        </button>
      </div>
    </form>
  )
}

function FilePreview({
  file,
  previewUrl,
  isVideo,
  onClear,
}: {
  file: File
  previewUrl: string | null
  isVideo: boolean
  onClear: () => void
}) {
  return (
    <div className="relative overflow-hidden rounded-md border border-hairline bg-surface-alt">
      {previewUrl &&
        (isVideo ? (
          <video src={previewUrl} className="max-h-72 w-full object-contain" controls playsInline />
        ) : (
          <img src={previewUrl} alt="" className="max-h-72 w-full object-contain" />
        ))}

      <div className="flex items-center justify-between gap-3 border-t border-hairline bg-surface px-4 py-2.5">
        <p className="min-w-0 flex-1 truncate text-xs text-ink-muted">
          {file.name} · {formatBytes(file.size)}
        </p>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-pill p-1.5 text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger"
          aria-label="Remove file"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
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
