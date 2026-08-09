import { Link } from 'react-router-dom'

import { Agenda } from '../components/Agenda'
import { Gallery, GalleryStatsRow } from '../components/Gallery'
import { Hero } from '../components/Hero'
import { QrPanel } from '../components/QrPanel'
import { SectionHeading } from '../components/ui'
import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { assetUrl } from '../lib/api'

export function Home() {
  const { lang, t } = useLang()
  const { config } = useSite()

  const copy = config?.content[lang]
  const coupleImage = config?.images.couple?.[0]

  return (
    <>
      <Hero />

      {/* Invitation — the couple's words, with their portrait when set. */}
      {copy?.invitation && (
        <section className="py-20 sm:py-28">
          <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className={coupleImage ? '' : 'mx-auto max-w-2xl text-center'}>
              <p className="eyebrow">{config?.content.hashtag}</p>
              <h2 className="mt-4 font-script text-4xl leading-tight text-primary sm:text-5xl">
                {config?.content.groomName} &amp; {config?.content.brideName}
              </h2>
              <p className="mt-6 text-base leading-loose text-ink-muted sm:text-lg">
                {copy.invitation}
              </p>

              <dl className="mt-9 grid gap-6 sm:grid-cols-2">
                <div>
                  <dt className="eyebrow">{lang === 'rw' ? 'Urusengero' : 'Ceremony'}</dt>
                  <dd className="mt-1.5 font-heading text-lg text-ink">
                    {copy.churchName}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow">
                    {lang === 'rw' ? 'Ibirori' : 'Reception'}
                  </dt>
                  <dd className="mt-1.5 font-heading text-lg text-ink">
                    {copy.receptionVenue}
                  </dd>
                </div>
              </dl>
            </div>

            {coupleImage && (
              <figure className="relative">
                <img
                  src={assetUrl(coupleImage.file_url)}
                  alt={
                    (lang === 'rw' ? coupleImage.caption_rw : coupleImage.caption_en) ?? ''
                  }
                  loading="lazy"
                  className="aspect-[4/5] w-full rounded-lg object-cover shadow-xl"
                />
                {/* Offset gold frame for a printed-invitation feel. */}
                <div
                  className="pointer-events-none absolute -bottom-4 -right-4 -z-10 h-full w-full rounded-lg border-2 border-accent/45"
                  aria-hidden="true"
                />
              </figure>
            )}
          </div>
        </section>
      )}

      <Agenda />

      {/* Gallery teaser */}
      <section className="py-20 sm:py-28">
        <div className="container-page">
          <SectionHeading
            eyebrow={config?.content.hashtag}
            title={copy?.galleryTitle ?? t('navGallery')}
            subtitle={copy?.gallerySubtitle}
          />
          <GalleryStatsRow />
          <Gallery limit={8} showFilters={false} showLoadMore={false} />
          <div className="mt-10 text-center">
            <Link to="/gallery" className="btn-outline">
              {t('viewAll')}
            </Link>
          </div>
        </div>
      </section>

      <QrPanel />
    </>
  )
}
