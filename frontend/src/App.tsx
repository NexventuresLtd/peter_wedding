import { useEffect } from 'react'
import { BrowserRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom'

import { Footer } from './components/Footer'
import { Nav } from './components/Nav'
import { Spinner, ToastProvider } from './components/ui'
import { AuthProvider } from './context/AuthContext'
import { LangProvider } from './context/LangContext'
import { SiteProvider, useSite } from './context/SiteContext'
import { GalleryPage } from './pages/GalleryPage'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import { UploadPage } from './pages/UploadPage'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AgendaEditor } from './pages/admin/AgendaEditor'
import { ImagesManager } from './pages/admin/ImagesManager'
import { Moderation } from './pages/admin/Moderation'
import { ThemeEditor } from './pages/admin/ThemeEditor'
import { UsersManager } from './pages/admin/UsersManager'

/** Reset the scroll position on navigation, but keep in-page anchors working. */
function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }

    // On a cold load of /#programme the target section has not mounted yet, so
    // the browser's own anchor jump finds nothing. Poll briefly for the element
    // and scroll once it appears.
    let frame = 0
    const deadline = performance.now() + 3000

    const tryScroll = () => {
      const target = document.querySelector(hash)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
      if (performance.now() < deadline) frame = requestAnimationFrame(tryScroll)
    }

    frame = requestAnimationFrame(tryScroll)
    return () => cancelAnimationFrame(frame)
  }, [pathname, hash])

  return null
}

/** The public site chrome: navigation on top, footer below. */
function PublicLayout() {
  const { loading, error } = useSite()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-primary">
        <Spinner className="h-9 w-9" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl text-primary">We could not load the site</h1>
        <p className="mt-3 max-w-md text-sm text-ink-muted">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-primary mt-7"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <LangProvider>
        <SiteProvider>
          <AuthProvider>
            <ToastProvider>
              <ScrollToTop />
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/gallery" element={<GalleryPage />} />
                  <Route path="/upload" element={<UploadPage />} />
                </Route>

                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Moderation />} />
                  <Route path="theme" element={<ThemeEditor />} />
                  <Route path="images" element={<ImagesManager />} />
                  <Route path="agenda" element={<AgendaEditor />} />
                  <Route path="users" element={<UsersManager />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </ToastProvider>
          </AuthProvider>
        </SiteProvider>
      </LangProvider>
    </BrowserRouter>
  )
}
