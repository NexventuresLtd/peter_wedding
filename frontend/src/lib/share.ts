import { assetUrl } from './api'
import type { GalleryItem } from './types'

/** A readable filename for a saved memory, e.g. "peter-yvette-photo-12.jpg". */
export function suggestedFilename(item: GalleryItem, couple = 'peter-yvette'): string {
  const source = item.file_url ?? ''
  const match = /\.([a-z0-9]{2,5})(?:\?|$)/i.exec(source)
  const extension = match ? match[1].toLowerCase() : item.kind === 'video' ? 'mp4' : 'jpg'
  return `${couple}-${item.kind}-${item.id}.${extension}`
}

/**
 * Save a photo or video to the device.
 *
 * Fetched as a blob rather than relying on <a download> so the filename is
 * honoured even when the media is served from another origin, where the
 * download attribute is silently ignored.
 */
export async function downloadItem(item: GalleryItem, couple?: string): Promise<void> {
  const url = assetUrl(item.file_url)
  if (!url) throw new Error('This item has no file to download.')

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not fetch the file (${response.status}).`)

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = suggestedFilename(item, couple)
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
}

export type ShareOutcome = 'shared' | 'copied' | 'cancelled'

/**
 * Share a memory.
 *
 * Prefers a native share sheet with the actual file attached, falls back to
 * sharing a link, and finally to copying the link to the clipboard. Returns
 * what actually happened so the UI can report it honestly rather than always
 * claiming success.
 */
export async function shareItem(
  item: GalleryItem,
  options: { title?: string; text?: string; couple?: string } = {},
): Promise<ShareOutcome> {
  const { title = 'A moment from our wedding', text, couple } = options
  const absolute = new URL(assetUrl(item.file_url) || '/gallery', window.location.origin)
    .href

  // 1. Native share with the file itself — the best result on phones.
  if (item.file_url && typeof navigator.canShare === 'function' && navigator.share) {
    try {
      const response = await fetch(assetUrl(item.file_url))
      if (response.ok) {
        const blob = await response.blob()
        const file = new File([blob], suggestedFilename(item, couple), {
          type: blob.type || 'application/octet-stream',
        })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title, text })
          return 'shared'
        }
      }
    } catch (error) {
      if (isAbort(error)) return 'cancelled'
      // Fall through to link sharing.
    }
  }

  // 2. Native share of a link.
  if (navigator.share) {
    try {
      await navigator.share({ title, text: text ?? item.message ?? undefined, url: absolute })
      return 'shared'
    } catch (error) {
      if (isAbort(error)) return 'cancelled'
    }
  }

  // 3. Clipboard.
  await copyToClipboard(absolute)
  return 'copied'
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export async function copyToClipboard(value: string): Promise<void> {
  // The Clipboard API is unavailable on insecure origins and can still reject
  // when permission is denied, so a failure here is expected rather than
  // exceptional — fall through to the legacy path instead of surfacing it.
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch {
      /* fall through */
    }
  }

  const field = document.createElement('textarea')
  field.value = value
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.top = '0'
  field.style.opacity = '0'
  document.body.appendChild(field)
  field.select()

  try {
    if (!document.execCommand('copy')) {
      throw new Error('Copying is not available in this browser.')
    }
  } finally {
    field.remove()
  }
}
