import { Link } from 'react-router-dom'

import { HeartIcon } from '../components/icons'
import { UploadForm } from '../components/UploadForm'
import { Ornament } from '../components/ui'
import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'

/**
 * The QR code lands here. Built mobile-first: single column, large touch
 * targets, and no hero image to download on a phone at a venue.
 */
export function UploadPage() {
  const { lang, t } = useLang()
  const { config } = useSite()
  const copy = config?.content[lang]

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-alt/70 to-canvas pb-20 pt-24 sm:pt-32">
      <div className="container-page max-w-2xl">
        <header className="mb-9 text-center">
          <p className="font-script text-4xl text-primary sm:text-5xl">
            {config?.content.groomName} &amp; {config?.content.brideName}
          </p>
          <Ornament className="mt-4" />
          <h1 className="mt-6 text-3xl leading-tight text-primary sm:text-4xl">
            {copy?.uploadTitle ?? t('navShare')}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-muted sm:text-base">
            {copy?.uploadSubtitle}
          </p>
        </header>

        <UploadForm />

        <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-ink-muted">
          <HeartIcon className="h-4 w-4 text-accent" />
          {config?.content.hashtag}
        </p>

        <div className="mt-6 text-center">
          <Link to="/gallery" className="btn-ghost text-sm">
            {t('viewAll')}
          </Link>
        </div>
      </div>
    </div>
  )
}
