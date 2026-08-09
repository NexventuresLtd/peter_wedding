import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { api, assetUrl } from '../lib/api'
import { CameraIcon, QrIcon } from './icons'
import { Ornament } from './ui'

export function QrPanel() {
  const { t, lang } = useLang()
  const { config } = useSite()
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    // The code image itself still renders if this fails — only the printed
    // URL beneath it goes missing.
    api.qrTarget().then(({ url }) => setTarget(url)).catch(() => setTarget(null))
  }, [])

  const copy = config?.content[lang]

  return (
    <section className="relative overflow-hidden bg-primary py-20 text-on-primary sm:py-28">
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

          {target && (
            <p className="mt-6 break-all text-xs text-on-primary/50">
              {t('qrOpen')}: <span className="text-accent">{target}</span>
            </p>
          )}
        </div>

        <div className="flex justify-center">
          <figure className="rounded-lg bg-white p-5 shadow-2xl sm:p-7">
            <img
              src={assetUrl('/qr?scale=12')}
              alt={t('qrTitle')}
              width={280}
              height={280}
              className="h-56 w-56 sm:h-72 sm:w-72"
            />
            <figcaption className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <QrIcon className="h-4 w-4" />
              {t('qrTitle')}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
