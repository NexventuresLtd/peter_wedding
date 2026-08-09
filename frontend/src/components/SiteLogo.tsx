import { useSite } from '../context/SiteContext'
import { assetUrl } from '../lib/api'
import { classNames } from '../lib/format'

/**
 * The site's wordmark, used in the public nav and across the admin console.
 *
 * Precedence: an uploaded logo image, then custom logo text, then the couple's
 * initials — so the header is never empty while settings are still loading,
 * and changing the logo in the admin updates every place it appears.
 */
export function SiteLogo({
  variant = 'ink',
  size = 'md',
  className,
}: {
  /** 'light' for placement over a photo, 'ink' for a light background. */
  variant?: 'light' | 'ink'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const { config } = useSite()

  const image = config?.images.logo?.find((entry) => entry.is_active)
  const text =
    config?.content.logoText?.trim() ||
    (config
      ? `${config.content.groomName?.[0] ?? 'P'} & ${config.content.brideName?.[0] ?? 'Y'}`
      : 'P & Y')

  const imageHeight = { sm: 'h-8', md: 'h-9 sm:h-11', lg: 'h-12 sm:h-14' }[size]
  const textSize = {
    sm: 'text-xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-4xl sm:text-5xl',
  }[size]

  if (image) {
    return (
      <img
        src={assetUrl(image.file_url)}
        alt={text}
        className={classNames(
          'w-auto max-w-[190px] object-contain transition-all',
          imageHeight,
          // A logo drawn for a light bar needs lifting off a photo.
          variant === 'light' && 'drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]',
          className,
        )}
      />
    )
  }

  return (
    <span
      className={classNames(
        'font-script leading-none transition-colors',
        textSize,
        variant === 'light' ? 'text-hero-title drop-shadow' : 'text-primary',
        className,
      )}
    >
      {text}
    </span>
  )
}

/** The couple's full names, in script — for the footer and page headers. */
export function CoupleNames({ className }: { className?: string }) {
  const { config } = useSite()
  const groom = config?.content.groomName ?? 'Peter'
  const bride = config?.content.brideName ?? 'Yvette'

  return (
    <span className={className}>
      {groom} &amp; {bride}
    </span>
  )
}
