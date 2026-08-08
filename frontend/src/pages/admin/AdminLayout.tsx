import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import {
  ImageIcon,
  ListIcon,
  LogoutIcon,
  MenuIcon,
  PaletteIcon,
  UsersIcon,
  XIcon,
} from '../../components/icons'
import { Badge, Spinner } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { classNames } from '../../lib/format'
import type { AdminRole } from '../../lib/types'
import { AdminLogin } from './AdminLogin'

interface NavItem {
  to: string
  label: string
  icon: typeof ListIcon
  minRole: AdminRole
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/admin', label: 'Moderation', icon: ListIcon, minRole: 'moderator', end: true },
  { to: '/admin/theme', label: 'Theme & content', icon: PaletteIcon, minRole: 'admin' },
  { to: '/admin/images', label: 'Wedding images', icon: ImageIcon, minRole: 'admin' },
  { to: '/admin/agenda', label: 'Agenda', icon: ListIcon, minRole: 'admin' },
  { to: '/admin/users', label: 'Admin users', icon: UsersIcon, minRole: 'superadmin' },
]

const ROLE_TONE: Record<AdminRole, 'gold' | 'green' | 'neutral'> = {
  superadmin: 'gold',
  admin: 'green',
  moderator: 'neutral',
}

export function AdminLayout() {
  const { user, loading, logout, can } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-primary">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!user) return <AdminLogin />

  const visible = NAV.filter((item) => can(item.minRole))

  return (
    <div className="min-h-screen bg-surface-alt/50">
      <header className="sticky top-0 z-30 border-b border-hairline bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="lg:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>
            <Link to="/" className="truncate font-script text-2xl text-primary">
              Peter &amp; Yvette
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="truncate text-sm font-medium text-ink">{user.full_name}</p>
              <p className="truncate text-xs text-ink-muted">{user.email}</p>
            </div>
            <Badge tone={ROLE_TONE[user.role]}>{user.role}</Badge>
            <button
              type="button"
              onClick={logout}
              className="rounded-pill p-2 text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogoutIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-5 py-8">
        <aside
          className={classNames(
            'shrink-0 lg:block lg:w-56',
            menuOpen
              ? 'fixed inset-x-0 top-16 z-20 border-b border-hairline bg-canvas p-5 shadow-lg lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none'
              : 'hidden',
          )}
        >
          <nav className="flex flex-col gap-1">
            {visible.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  classNames(
                    'flex items-center gap-3 rounded-md px-4 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-on-primary'
                      : 'text-ink-muted hover:bg-ink/5 hover:text-ink',
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>

          <Link
            to="/"
            className="mt-6 block px-4 text-xs text-ink-muted underline-offset-4 hover:text-accent hover:underline"
          >
            ← View the public site
          </Link>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
