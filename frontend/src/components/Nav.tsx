import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { classNames } from '../lib/format'
import { GlobeIcon, MenuIcon, XIcon } from './icons'

export function Nav() {
  const { t, lang, toggle } = useLang()
  const { config } = useSite()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Transparent over the hero, solid once the user scrolls past it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setMenuOpen(false), [location.pathname])

  const onHome = location.pathname === '/'
  const solid = scrolled || !onHome || menuOpen

  const links = [
    { to: onHome ? '#programme' : '/#programme', label: t('navProgramme') },
    { to: '/gallery', label: t('navGallery') },
    { to: '/upload', label: t('navShare') },
  ]

  const initials = config
    ? `${config.content.groomName[0] ?? 'P'} & ${config.content.brideName[0] ?? 'Y'}`
    : 'P & Y'

  return (
    <header
      className={classNames(
        'fixed inset-x-0 top-0 z-40 transition-all duration-300',
        solid
          ? 'border-b border-hairline bg-canvas/92 backdrop-blur-md'
          : 'bg-transparent',
      )}
    >
      <nav className="container-page flex h-16 items-center justify-between sm:h-20">
        <Link
          to="/"
          className={classNames(
            'font-script text-2xl leading-none transition-colors sm:text-3xl',
            solid ? 'text-primary' : 'text-white drop-shadow',
          )}
        >
          {initials}
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} solid={solid}>
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
                : 'border-white/40 text-white hover:bg-white/15',
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
            solid ? 'text-primary' : 'text-white drop-shadow',
          )}
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label="Menu"
        >
          {menuOpen ? <XIcon className="h-7 w-7" /> : <MenuIcon className="h-7 w-7" />}
        </button>
      </nav>

      {menuOpen && (
        <div className="border-t border-hairline bg-canvas px-5 pb-5 pt-2 md:hidden">
          <ul className="flex flex-col">
            {links.map((link) => (
              <li key={link.to}>
                <MobileLink to={link.to}>{link.label}</MobileLink>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={toggle}
            className="btn-outline mt-3 w-full"
          >
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
  children,
}: {
  to: string
  solid: boolean
  children: React.ReactNode
}) {
  const className = classNames(
    'relative px-4 py-2 text-sm font-medium transition-colors',
    'after:absolute after:inset-x-4 after:bottom-1 after:h-px after:origin-left',
    'after:scale-x-0 after:bg-accent after:transition-transform hover:after:scale-x-100',
    solid ? 'text-ink hover:text-primary' : 'text-white/90 hover:text-white',
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
