import { Link } from 'react-router-dom'

import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { QrCard } from './QrCode'
import { Ornament } from './ui'

export function Footer() {
  const { t, lang } = useLang()
  const { config } = useSite()

  const groom = config?.content.groomName ?? 'Peter'
  const bride = config?.content.brideName ?? 'Yvette'
  const copy = config?.content[lang]

  return (
    <footer className="bg-primary text-on-primary">
      <div className="container-page py-16 text-center">
        <p className="font-script text-4xl text-accent sm:text-5xl">
          {groom} &amp; {bride}
        </p>

        <Ornament className="mt-6 opacity-70" />

        {config?.content.qrPlacement === 'footer' && (
          <div className="mt-9 flex flex-col items-center">
            <QrCard size="sm" showUrl={false} />
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-on-primary/70">
              {copy?.uploadSubtitle ?? t('qrBody')}
            </p>
          </div>
        )}

        {copy?.thankYou && (
          <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-on-primary/75">
            {copy.thankYou}
          </p>
        )}

        {config?.content.hashtag && (
          <p className="mt-5 text-sm font-semibold tracking-[0.18em] text-accent">
            {config.content.hashtag}
          </p>
        )}

        <nav className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm">
          <Link to="/" className="text-on-primary/70 transition-colors hover:text-accent">
            {t('navHome')}
          </Link>
          <Link
            to="/gallery"
            className="text-on-primary/70 transition-colors hover:text-accent"
          >
            {t('navGallery')}
          </Link>
          <Link
            to="/upload"
            className="text-on-primary/70 transition-colors hover:text-accent"
          >
            {t('navShare')}
          </Link>
          <Link
            to="/admin"
            className="text-on-primary/40 transition-colors hover:text-accent"
          >
            Admin
          </Link>
        </nav>
      </div>

      <div className="border-t border-white/10 py-6">
        <p className="text-center text-xs tracking-wide text-on-primary/60">
          {t('poweredBy')}{' '}
          <a
            href="https://nexventures.net"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent underline-offset-4 transition-opacity hover:opacity-80 hover:underline"
          >
            nexventures.net
          </a>
        </p>
      </div>
    </footer>
  )
}
