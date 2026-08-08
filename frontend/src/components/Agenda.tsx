import { useEffect, useState } from 'react'

import { useLang } from '../context/LangContext'
import { api } from '../lib/api'
import type {
  AgendaItem,
  AgendaSectionKey,
  Bullet,
  Lang,
  SectionTitles,
} from '../lib/types'
import { ChurchIcon, GlassIcon, MusicIcon } from './icons'
import { ErrorState, SectionHeading, Skeleton } from './ui'

const SECTION_ORDER: AgendaSectionKey[] = ['ceremony', 'reception', 'afterparty']

const SECTION_ICON: Record<AgendaSectionKey, typeof ChurchIcon> = {
  ceremony: ChurchIcon,
  reception: GlassIcon,
  afterparty: MusicIcon,
}

/** Normalise a bullet into { text, children } regardless of which shape it is. */
function readBullet(bullet: Bullet): { text: string; children: string[] } {
  if (typeof bullet === 'string') return { text: bullet, children: [] }
  return { text: bullet.text, children: bullet.children ?? [] }
}

function itemBody(item: AgendaItem, lang: Lang) {
  const summary = lang === 'rw' ? item.summary_rw : item.summary_en
  const bullets = lang === 'rw' ? item.bullets_rw : item.bullets_en
  // Fall back to the other language rather than showing an empty slot.
  const fallbackSummary = lang === 'rw' ? item.summary_en : item.summary_rw
  const fallbackBullets = lang === 'rw' ? item.bullets_en : item.bullets_rw

  return {
    summary: summary || fallbackSummary || null,
    bullets: (bullets?.length ? bullets : (fallbackBullets ?? [])) as Bullet[],
  }
}

export function Agenda() {
  const { lang, t } = useLang()
  const [items, setItems] = useState<AgendaItem[]>([])
  const [titles, setTitles] = useState<SectionTitles | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [agenda, sections] = await Promise.all([api.agenda(), api.agendaSections()])
      setItems(agenda)
      setTitles(sections)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the programme.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <section id="programme" className="scroll-mt-20 bg-surface-alt/40 py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading
          eyebrow={t('programmeSubtitle')}
          title={t('programmeTitle')}
        />

        {loading && <AgendaSkeleton />}

        {error && !loading && (
          <ErrorState message={error} onRetry={load} retryLabel={t('retry')} />
        )}

        {!loading && !error && (
          <div className="space-y-16">
            {SECTION_ORDER.map((section) => {
              const sectionItems = items.filter((item) => item.section === section)
              if (sectionItems.length === 0) return null

              const Icon = SECTION_ICON[section]
              return (
                <div key={section}>
                  <div className="mb-9 flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-primary text-on-primary shadow-sm">
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="text-xl text-primary sm:text-2xl">
                      {titles?.[section]?.[lang] ?? section}
                    </h3>
                  </div>

                  <ol className="relative ml-6 border-l-2 border-dashed border-accent/35 pl-7 sm:ml-6 sm:pl-10">
                    {sectionItems.map((item, index) => (
                      <TimelineEntry
                        key={item.id}
                        item={item}
                        lang={lang}
                        index={index}
                      />
                    ))}
                  </ol>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function TimelineEntry({
  item,
  lang,
  index,
}: {
  item: AgendaItem
  lang: Lang
  index: number
}) {
  const { summary, bullets } = itemBody(item, lang)

  return (
    <li
      className="relative mb-6 animate-fade-up last:mb-0"
      style={{ animationDelay: `${Math.min(index * 60, 400)}ms` }}
    >
      {/* Node on the timeline rail. */}
      <span
        className="absolute -left-[43px] top-6 flex h-4 w-4 items-center justify-center rounded-pill border-2 border-accent bg-canvas sm:-left-[53px]"
        aria-hidden="true"
      >
        <span className="h-1.5 w-1.5 rounded-pill bg-accent" />
      </span>

      <article className="card p-5 transition-shadow duration-300 hover:shadow-md sm:p-6">
        {/* Cormorant defaults to oldstyle figures, which turn "01:00" into
            "oI:oo". Lining numerals keep the serif but make the times read. */}
        <p className="font-heading text-lg font-semibold tracking-wide text-accent lining-nums sm:text-xl">
          {item.time_label}
        </p>

        {summary && (
          <p className="mt-2 text-[15px] leading-relaxed text-ink sm:text-base">
            {summary}
          </p>
        )}

        {bullets.length > 0 && (
          <ul className="mt-3 space-y-2.5">
            {bullets.map((bullet, bulletIndex) => {
              const { text, children } = readBullet(bullet)
              return (
                <li key={bulletIndex} className="text-[15px] leading-relaxed text-ink">
                  <span className="flex gap-3">
                    <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" />
                    <span>{text}</span>
                  </span>
                  {children.length > 0 && (
                    <ul className="ml-6 mt-2 space-y-2">
                      {children.map((child, childIndex) => (
                        <li
                          key={childIndex}
                          className="flex gap-3 text-sm text-ink-muted"
                        >
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-pill bg-ink-muted/60" />
                          <span>{child}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </article>
    </li>
  )
}

function AgendaSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="ml-6 pl-7 sm:pl-10">
          <Skeleton className="h-28 w-full" />
        </div>
      ))}
    </div>
  )
}
