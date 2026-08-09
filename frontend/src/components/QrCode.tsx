import { useEffect, useState } from 'react'

import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { api, assetUrl } from '../lib/api'
import { classNames } from '../lib/format'
import { QrIcon } from './icons'

/**
 * The upload QR code.
 *
 * Rendered by the backend so the printed card and the on-screen code are
 * always the same image, and so it encodes the deployed origin rather than
 * whatever the frontend happens to be running on.
 *
 * The PNG background is transparent, so on a light surface the code sits
 * directly on the page with no plate behind it.
 *
 * On a dark surface it needs a light plate. Scanners require dark modules on a
 * light ground: an inverted code — light modules on dark — fails to decode,
 * which was verified rather than assumed. The plate uses the theme's champagne
 * tone rather than white so it reads as part of the design.
 */
export function QrCard({
  size = 'md',
  onDark = false,
  showUrl = true,
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  /** Set when the surrounding surface is dark, so a light plate is drawn. */
  onDark?: boolean
  showUrl?: boolean
  className?: string
}) {
  const { t } = useLang()
  const { config } = useSite()
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    // The image renders regardless; only the printed URL beneath it is lost
    // if this fails.
    api
      .qrTarget()
      .then(({ url }) => setTarget(url))
      .catch(() => setTarget(null))
  }, [])

  // Always dark modules — this is what makes the code scannable.
  const moduleColour = config?.theme.colors.primary ?? '#0F4C3A'

  const dimensions = {
    sm: 'h-32 w-32',
    md: 'h-52 w-52 sm:h-60 sm:w-60',
    lg: 'h-60 w-60 sm:h-72 sm:w-72',
  }[size]

  const src = assetUrl(
    `/qr?scale=${size === 'sm' ? 8 : 12}&fg=${encodeURIComponent(moduleColour)}&bg=transparent`,
  )

  const image = (
    <img
      src={src}
      alt={t('qrTitle')}
      width={288}
      height={288}
      className={dimensions}
    />
  )

  return (
    <figure className={classNames('flex flex-col items-center', className)}>
      {onDark ? (
        <div
          className={classNames(
            'rounded-lg bg-accent-soft shadow-xl ring-1 ring-black/5 transition-transform duration-300 hover:scale-[1.02]',
            size === 'sm' ? 'p-3' : 'p-5',
          )}
        >
          {image}
        </div>
      ) : (
        image
      )}

      <figcaption
        className={classNames(
          'mt-3 flex items-center justify-center gap-2 font-semibold uppercase tracking-[0.18em]',
          size === 'sm' ? 'text-[10px]' : 'text-xs',
          onDark ? 'text-hero-text' : 'text-primary',
        )}
      >
        <QrIcon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
        {t('qrTitle')}
      </figcaption>

      {showUrl && target && (
        <p
          className={classNames(
            'mt-1.5 break-all text-center text-[10px]',
            onDark ? 'text-hero-text/60' : 'text-ink-muted',
          )}
        >
          {target.replace(/^https?:\/\//, '')}
        </p>
      )}
    </figure>
  )
}
