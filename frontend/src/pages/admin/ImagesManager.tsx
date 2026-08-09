import { useEffect, useRef, useState } from 'react'

import { ImageIcon, TrashIcon, UploadIcon } from '../../components/icons'
import { Badge, EmptyState, Modal, Spinner, useToast } from '../../components/ui'
import { useSite } from '../../context/SiteContext'
import { api, assetUrl } from '../../lib/api'
import type { SiteImage } from '../../lib/types'

const SLOTS: { key: string; label: string; hint: string }[] = [
  {
    key: 'logo',
    hint:
      'Wordmark in the navigation bar. A transparent PNG or SVG works best — it sits on the photo at the top of the page and on a light bar once scrolled. Overrides the logo text.',
    label: 'Site logo',
  },
  {
    key: 'hero',
    label: 'Hero background',
    hint: 'The full-screen photo behind the names. Landscape works best. Only the first active image is used.',
  },
  {
    key: 'couple',
    label: 'Couple portrait',
    hint: 'Shown beside the invitation text on the home page. Portrait orientation.',
  },
  {
    key: 'gallery',
    label: 'Curated gallery',
    hint: 'Official photos, kept separate from what guests upload.',
  },
  { key: 'story', label: 'Story', hint: 'Spare slot for extra imagery.' },
  { key: 'invitation', label: 'Invitation card', hint: 'A scan of the printed invitation.' },
]

export function ImagesManager() {
  const { refresh } = useSite()
  const { notify } = useToast()

  const [images, setImages] = useState<SiteImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SiteImage | null>(null)
  const [busy, setBusy] = useState(false)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  const load = async () => {
    setLoading(true)
    try {
      setImages(await api.adminImages())
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not load images.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const upload = async (slot: string, file: File) => {
    setUploadingSlot(slot)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('slot', slot)
      form.append('sort_order', String(images.filter((i) => i.slot === slot).length))
      await api.addImage(form)
      notify('Image added.')
      await load()
      await refresh()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Upload failed.', 'error')
    } finally {
      setUploadingSlot(null)
    }
  }

  const toggleActive = async (image: SiteImage) => {
    try {
      await api.updateImage(image.id, { is_active: !image.is_active })
      await load()
      await refresh()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Update failed.', 'error')
    }
  }

  const saveCaption = async (image: SiteImage, caption_en: string, caption_rw: string) => {
    try {
      await api.updateImage(image.id, { caption_en, caption_rw })
      notify('Caption saved.')
      await load()
      await refresh()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Update failed.', 'error')
    }
  }

  const remove = async (image: SiteImage) => {
    setBusy(true)
    try {
      await api.deleteImage(image.id)
      notify('Image deleted.')
      setConfirmDelete(null)
      await load()
      await refresh()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Delete failed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-primary">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div>
      <header className="mb-7">
        <h1 className="text-2xl text-primary sm:text-3xl">Wedding images</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          The couple's own photography, separate from the guest gallery.
        </p>
      </header>

      <div className="space-y-8">
        {SLOTS.map((slot) => {
          const slotImages = images.filter((image) => image.slot === slot.key)
          return (
            <section key={slot.key} className="card p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg text-primary">{slot.label}</h2>
                  <p className="mt-1 max-w-xl text-xs text-ink-muted">{slot.hint}</p>
                </div>

                <button
                  type="button"
                  onClick={() => inputs.current[slot.key]?.click()}
                  disabled={uploadingSlot === slot.key}
                  className="btn-outline px-4 py-2 text-sm"
                >
                  {uploadingSlot === slot.key ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <UploadIcon className="h-4 w-4" />
                  )}
                  Add image
                </button>

                <input
                  ref={(element) => {
                    inputs.current[slot.key] = element
                  }}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void upload(slot.key, file)
                    event.target.value = ''
                  }}
                />
              </div>

              {slotImages.length === 0 ? (
                <EmptyState
                  icon={<ImageIcon className="h-8 w-8" />}
                  title="No image yet"
                  body="The site falls back to a gradient until you add one."
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {slotImages.map((image) => (
                    <ImageCard
                      key={image.id}
                      image={image}
                      onToggle={() => toggleActive(image)}
                      onDelete={() => setConfirmDelete(image)}
                      onSaveCaption={(en, rw) => saveCaption(image, en, rw)}
                    />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)}>
        <div className="p-7">
          <h2 className="text-xl text-primary">Delete this image?</h2>
          <p className="mt-3 text-sm text-ink-muted">
            The file is removed from the server. This cannot be undone.
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

function ImageCard({
  image,
  onToggle,
  onDelete,
  onSaveCaption,
}: {
  image: SiteImage
  onToggle: () => void
  onDelete: () => void
  onSaveCaption: (captionEn: string, captionRw: string) => void
}) {
  const [captionEn, setCaptionEn] = useState(image.caption_en ?? '')
  const [captionRw, setCaptionRw] = useState(image.caption_rw ?? '')

  const dirty =
    captionEn !== (image.caption_en ?? '') || captionRw !== (image.caption_rw ?? '')

  return (
    <article className="overflow-hidden rounded-md border border-hairline">
      <div className="relative">
        <img
          src={assetUrl(image.thumb_url ?? image.file_url)}
          alt=""
          loading="lazy"
          className="h-40 w-full bg-surface-alt object-cover"
        />
        {!image.is_active && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/55">
            <Badge tone="neutral">Hidden</Badge>
          </span>
        )}
      </div>

      <div className="space-y-2.5 p-3">
        <input
          type="text"
          value={captionEn}
          onChange={(event) => setCaptionEn(event.target.value)}
          placeholder="Caption (English)"
          className="field-input px-3 py-1.5 text-xs"
        />
        <input
          type="text"
          value={captionRw}
          onChange={(event) => setCaptionRw(event.target.value)}
          placeholder="Ubusobanuro (Kinyarwanda)"
          className="field-input px-3 py-1.5 text-xs"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggle}
            className="btn flex-1 border border-hairline px-3 py-1.5 text-xs text-ink-muted hover:text-ink"
          >
            {image.is_active ? 'Hide' : 'Show'}
          </button>
          {dirty && (
            <button
              type="button"
              onClick={() => onSaveCaption(captionEn, captionRw)}
              className="btn flex-1 bg-primary px-3 py-1.5 text-xs text-on-primary"
            >
              Save
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="btn border border-hairline px-2.5 py-1.5 text-ink-muted hover:border-danger/40 hover:text-danger"
            aria-label="Delete image"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  )
}
