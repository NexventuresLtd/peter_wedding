import { Link } from 'react-router-dom'

import { Ornament } from '../components/ui'
import { useLang } from '../context/LangContext'

export function NotFound() {
  const { t } = useLang()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-script text-7xl text-accent">404</p>
      <Ornament className="mt-5" />
      <h1 className="mt-6 text-2xl text-primary">
        This page has wandered off to the dance floor.
      </h1>
      <Link to="/" className="btn-primary mt-8">
        {t('navHome')}
      </Link>
    </div>
  )
}
