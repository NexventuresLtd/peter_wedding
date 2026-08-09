import { Link } from 'react-router-dom'

import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { CameraIcon } from './icons'
import { QrCard } from './QrCode'
import { Ornament } from './ui'

/**
 * The full-width QR section. Rendered only when the couple has chosen
 * "own section" as the QR placement — otherwise the code appears in the hero
 * or the footer instead.
 */
export function QrPanel() {
  const { t, lang } = useLang()
  const { config } = useSite()

  const placement = config?.content.qrPlacement ?? 'section'
  if (placement !== 'section') return null

  const copy = config?.content[lang]

  return (
    <section id="share" className="relative scroll-mt-20 overflow-hidden bg-primary py-20 text-on-primary sm:py-28">
      {/* Soft gold bloom behind the card. */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-pill opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgb(var(--c-accent)) 0%, transparent 65%)' }}
        aria-hidden="true"
      />

      <div className="container-page relative grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="text-center lg:text-left">
          <p className="eyebrow">{t('qrTitle')}</p>
          <h2 className="mt-4 text-3xl leading-tight text-white sm:text-4xl md:text-[2.75rem]">
            {copy?.uploadTitle ?? t('qrTitle')}
          </h2>
          <Ornament className="mt-5 opacity-80 lg:justify-start" />
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-on-primary/80 lg:mx-0">
            {copy?.uploadSubtitle ?? t('qrBody')}
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link to="/upload" className="btn-accent w-full sm:w-auto">
              <CameraIcon className="h-5 w-5" />
              {t('navShare')}
            </Link>
          </div>
        </div>

        <div className="flex justify-center">
          <QrCard size="lg" />
        </div>
      </div>
    </section>
  )
}
