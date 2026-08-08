import { Link } from 'react-router-dom'

import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { daysUntil, formatWeddingDate } from '../lib/format'
import { CameraIcon, ChurchIcon } from './icons'

export function Hero() {
  const { lang, t } = useLang()
  const { config } = useSite()

  const content = config?.content
  const copy = content?.[lang]
  const heroImage = config?.images.hero?.[0]?.file_url
  const overlay = config?.theme.heroOverlay ?? 0.45

  const dateLabel = content ? formatWeddingDate(content.weddingDate, lang) : null
  const countdown = content ? daysUntil(content.weddingDate) : null

  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden">
      {/* Backdrop: the couple's photo when set, otherwise a deep gradient that
          still looks intentional rather than "missing image". */}
      {heroImage ? (
        <img
          src={heroImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 50% 0%, rgb(var(--c-primary)) 0%, rgb(var(--c-primary-dark)) 55%, #061c15 100%)',
          }}
        />
      )}

      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, rgba(6,20,15,${overlay * 0.85}) 0%, rgba(6,20,15,${overlay * 0.5}) 40%, rgba(6,20,15,${Math.min(overlay + 0.3, 0.92)}) 100%)`,
        }}
      />

      {/* Fine gold frame, inset from the edges. */}
      <div
        className="pointer-events-none absolute inset-4 rounded-lg border border-accent/25 sm:inset-8"
        aria-hidden="true"
      />

      <div className="container-page relative z-10 py-28 text-center text-white">
        {copy?.heroKicker && (
          <p className="animate-fade-up text-xs font-semibold uppercase tracking-[0.34em] text-accent sm:text-sm">
            {copy.heroKicker}
          </p>
        )}

        <h1
          className="mt-6 animate-fade-up font-script text-6xl leading-[1.05] text-white drop-shadow-lg sm:text-7xl md:text-8xl lg:text-9xl"
          style={{ animationDelay: '80ms' }}
        >
          {content?.groomName ?? 'Peter'}
          <span className="mx-3 text-accent sm:mx-5">&amp;</span>
          {content?.brideName ?? 'Yvette'}
        </h1>

        <div
          className="mx-auto mt-8 flex max-w-md animate-fade-up items-center gap-4"
          style={{ animationDelay: '160ms' }}
        >
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-accent/70" />
          <ChurchIcon className="h-5 w-5 shrink-0 text-accent" />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-accent/70" />
        </div>

        {dateLabel && (
          <p
            className="mt-7 animate-fade-up font-heading text-xl tracking-wide text-white/95 lining-nums sm:text-2xl"
            style={{ animationDelay: '220ms' }}
          >
            {dateLabel}
          </p>
        )}

        {copy?.churchName && (
          <p
            className="mt-2 animate-fade-up text-sm uppercase tracking-[0.2em] text-white/70"
            style={{ animationDelay: '260ms' }}
          >
            {copy.churchName}
          </p>
        )}

        {copy?.heroTagline && (
          <p
            className="mx-auto mt-7 max-w-xl animate-fade-up text-base leading-relaxed text-white/85 sm:text-lg"
            style={{ animationDelay: '300ms' }}
          >
            {copy.heroTagline}
          </p>
        )}

        {countdown !== null && (
          <p
            className="mt-8 inline-flex animate-fade-up items-center gap-2 rounded-pill border border-accent/40 bg-black/25 px-5 py-2 text-sm font-medium text-accent backdrop-blur-sm"
            style={{ animationDelay: '340ms' }}
          >
            {countdown === 0
              ? lang === 'rw'
                ? 'Ni uyu munsi!'
                : "It's today!"
              : lang === 'rw'
                ? `Hasigaye iminsi ${countdown}`
                : `${countdown} ${countdown === 1 ? 'day' : 'days'} to go`}
          </p>
        )}

        <div
          className="mt-11 flex animate-fade-up flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
          style={{ animationDelay: '400ms' }}
        >
          <Link to="/upload" className="btn-accent w-full sm:w-auto">
            <CameraIcon className="h-5 w-5" />
            {t('navShare')}
          </Link>
          <a
            href="#programme"
            className="btn w-full border border-white/35 text-white backdrop-blur-sm hover:bg-white/10 sm:w-auto"
          >
            {t('navProgramme')}
          </a>
        </div>
      </div>

      <a
        href="#programme"
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-white/60 transition-colors hover:text-accent"
        aria-label={t('navProgramme')}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="animate-bounce"
        >
          <path d="M6 9.5 12 15.5 18 9.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </section>
  )
}
