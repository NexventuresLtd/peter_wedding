import { Link } from 'react-router-dom'

import { Gallery, GalleryStatsRow } from '../components/Gallery'
import { CameraIcon } from '../components/icons'
import { SectionHeading } from '../components/ui'
import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'

export function GalleryPage() {
  const { lang, t } = useLang()
  const { config } = useSite()
  const copy = config?.content[lang]

  return (
    <div className="pb-24 pt-28 sm:pt-36">
      <div className="container-page">
        <SectionHeading
          eyebrow={config?.content.hashtag}
          title={copy?.galleryTitle ?? t('navGallery')}
          subtitle={copy?.gallerySubtitle}
        />

        <GalleryStatsRow />

        <div className="mb-10 text-center">
          <Link to="/upload" className="btn-accent">
            <CameraIcon className="h-5 w-5" />
            {t('navShare')}
          </Link>
        </div>

        <Gallery />
      </div>
    </div>
  )
}
