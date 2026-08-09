import { useEffect, useState } from 'react'

import { useLang } from '../context/LangContext'
import { api, assetUrl } from '../lib/api'
import { classNames } from '../lib/format'
import { QrIcon } from './icons'

/**
 * The upload QR code. Rendered by the backend so the printed card and the
 * on-screen code are always the same image, and so it encodes the deployed
 * origin rather than whatever the frontend happens to be running on.
 */
export function QrCard({
  size = 'md',
  showUrl = true,
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  showUrl?: boolean
  className?: string
}) {
  const { t } = useLang()
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    // The image renders regardless; only the printed URL beneath it is lost
    // if this fails.
    api
      .qrTarget()
      .then(({ url }) => setTarget(url))
      .catch(() => setTarget(null))
  }, [])

  const dimensions = {
    sm: 'h-32 w-32',
    md: 'h-56 w-56 sm:h-64 sm:w-64',
    lg: 'h-64 w-64 sm:h-72 sm:w-72',
  }[size]

  const padding = { sm: 'p-3', md: 'p-5 sm:p-6', lg: 'p-5 sm:p-7' }[size]

  return (
    <figure
      className={classNames(
        'rounded-lg bg-white shadow-2xl transition-transform duration-300 hover:scale-[1.02]',
        padding,
        className,
      )}
    >
      <img
        src={assetUrl(`/qr?scale=${size === 'sm' ? 8 : 12}`)}
        alt={t('qrTitle')}
        width={288}
        height={288}
        className={dimensions}
      />
      <figcaption
        className={classNames(
          'mt-3 flex items-center justify-center gap-2 font-semibold uppercase tracking-[0.18em] text-primary',
          size === 'sm' ? 'text-[10px]' : 'text-xs',
        )}
      >
        <QrIcon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
        {t('qrTitle')}
      </figcaption>

      {showUrl && target && (
        <p className="mt-1.5 break-all text-center text-[10px] text-ink-muted">
          {target.replace(/^https?:\/\//, '')}
        </p>
      )}
    </figure>
  )
}
