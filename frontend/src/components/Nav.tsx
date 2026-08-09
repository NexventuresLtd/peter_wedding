import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { assetUrl } from '../lib/api'
import { classNames } from '../lib/format'
import { GlobeIcon, MenuIcon, XIcon } from './icons'

/** Sections the nav can highlight while scrolling the home page. */
const TRACKED_SECTIONS = ['programme', 'gallery-teaser', 'share'] as const

export function Nav() {
  const { t, lang, toggle } = useLang()
  const { config } = useSite()
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [progress, setProgress] = useState(0)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const onHome = location.pathname === '/'

  // Solid background past the hero, a reading-progress rule, and hide-on-scroll-
  // down / show-on-scroll-up so the bar keeps out of the way on phones.
  useEffect(() => {
    let lastY = window.scrollY
    let frame = 0

    const measure = () => {
      const y = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight

      setScrolled(y > 40)
      setProgress(max > 0 ? Math.min(y / max, 1) : 0)
      // Never hide while the menu is open or near the very top.
      setHidden(y > 320 && y > lastY + 4)
      lastY = y
      frame = 0
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  // Highlight whichever section is currently in view.
  useEffect(() => {
    if (!onHome) {
      setActiveSection(null)
      return
    }

    const elements = TRACKED_SECTIONS.map((id) => document.getElementById(id)).filter(
      (element): element is HTMLElement => element !== null,
    )
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveSection(visible.target.id)
      },
      // Bias towards the middle of the viewport so the highlight changes when
      // a section is genuinely being read, not when it first peeks in.
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] },
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [onHome, location.pathname])

  useEffect(() => setMenuOpen(false), [location.pathname])

  // Keep the bar visible whenever the mobile menu is open.
  useEffect(() => {
    if (menuOpen) setHidden(false)
  }, [menuOpen])

  const solid = scrolled || !onHome || menuOpen

  const links = [
    {
      to: onHome ? '#programme' : '/#programme',
      label: t('navProgramme'),
      section: 'programme',
    },
    { to: '/gallery', label: t('navGallery'), section: 'gallery-teaser' },
    { to: '/upload', label: t('navShare'), section: 'share' },
  ]

  // Logo precedence: an uploaded image, then custom text, then the couple's
  // initials so the bar is never empty while settings load.
  const logoImage = config?.images.logo?.find((image) => image.is_active)
  const wordmark =
    config?.content.logoText?.trim() ||
    (config
      ? `${config.content.groomName[0] ?? 'P'} & ${config.content.brideName[0] ?? 'Y'}`
      : 'P & Y')

  return (
    <header
      className={classNames(
        'fixed inset-x-0 top-0 z-40 transition-[transform,background-color,box-shadow] duration-300',
        hidden && !menuOpen ? '-translate-y-full' : 'translate-y-0',
        solid
          ? 'border-b border-hairline bg-canvas/92 shadow-sm backdrop-blur-md'
          : 'bg-transparent',
      )}
    >
      <nav className="container-page flex h-16 items-center justify-between sm:h-20">
        <Link to="/" className="flex items-center" aria-label={wordmark}>
          {logoImage ? (
            <img
              src={assetUrl(logoImage.file_url)}
              alt={wordmark}
              className={classNames(
                'h-9 w-auto max-w-[190px] object-contain transition-all sm:h-11',
                // A logo made for a light bar needs lifting off the hero photo.
                solid ? '' : 'drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]',
              )}
            />
          ) : (
            <span
              className={classNames(
                'font-script text-2xl leading-none transition-colors sm:text-3xl',
                solid ? 'text-primary' : 'text-hero-title drop-shadow',
              )}
            >
              {wordmark}
            </span>
          )}
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              solid={solid}
              active={onHome && activeSection === link.section}
            >
              {link.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={toggle}
            className={classNames(
              'ml-2 inline-flex items-center gap-1.5 rounded-pill border px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
              solid
                ? 'border-hairline text-ink-muted hover:border-accent hover:text-accent'
                : 'border-hero-text/40 text-hero-text hover:bg-white/15',
            )}
            aria-label={`Switch to ${t('langLabel')}`}
          >
            <GlobeIcon className="h-4 w-4" />
            {lang === 'en' ? 'RW' : 'EN'}
          </button>
        </div>

        <button
          type="button"
          className={classNames(
            'md:hidden',
            solid ? 'text-primary' : 'text-hero-title drop-shadow',
          )}
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label="Menu"
        >
          {menuOpen ? <XIcon className="h-7 w-7" /> : <MenuIcon className="h-7 w-7" />}
        </button>
      </nav>

      {/* Reading progress. Hidden over the hero, where there is nothing to
          measure yet. */}
      <div
        className={classNames(
          'h-0.5 origin-left bg-accent transition-opacity duration-300',
          scrolled ? 'opacity-100' : 'opacity-0',
        )}
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden="true"
      />

      {menuOpen && (
        <div className="border-t border-hairline bg-canvas px-5 pb-5 pt-2 md:hidden">
          <ul className="flex flex-col">
            {links.map((link) => (
              <li key={link.to}>
                <MobileLink to={link.to}>{link.label}</MobileLink>
              </li>
            ))}
          </ul>
          <button type="button" onClick={toggle} className="btn-outline mt-3 w-full">
            <GlobeIcon className="h-4 w-4" />
            {t('langLabel')}
          </button>
        </div>
      )}
    </header>
  )
}

function NavLink({
  to,
  solid,
  active,
  children,
}: {
  to: string
  solid: boolean
  active: boolean
  children: React.ReactNode
}) {
  const className = classNames(
    'relative px-4 py-2 text-sm font-medium transition-colors',
    'after:absolute after:inset-x-4 after:bottom-1 after:h-px after:origin-left',
    'after:bg-accent after:transition-transform after:duration-300 hover:after:scale-x-100',
    active ? 'after:scale-x-100' : 'after:scale-x-0',
    solid
      ? active
        ? 'text-primary'
        : 'text-ink hover:text-primary'
      : 'text-hero-text/90 hover:text-hero-title',
  )

  // In-page anchors must not go through the router or the hash is swallowed.
  if (to.startsWith('#')) {
    return (
      <a href={to} className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  )
}

function MobileLink({ to, children }: { to: string; children: React.ReactNode }) {
  const className =
    'block border-b border-hairline py-3.5 text-base font-medium text-ink last:border-0'

  if (to.startsWith('#') || to.startsWith('/#')) {
    return (
      <a href={to} className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  )
}
