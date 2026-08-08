export type Lang = 'en' | 'rw'

export type UploadKind = 'photo' | 'video' | 'text'
export type UploadStatus = 'pending' | 'approved' | 'rejected'
export type AdminRole = 'superadmin' | 'admin' | 'moderator'
export type AgendaSectionKey = 'ceremony' | 'reception' | 'afterparty'

/** A bullet is either plain text or a heading with nested children. */
export type Bullet = string | { text: string; children?: string[] }

export interface AgendaItem {
  id: number
  section: AgendaSectionKey
  time_label: string
  summary_en: string | null
  summary_rw: string | null
  bullets_en: Bullet[]
  bullets_rw: Bullet[]
  sort_order: number
  is_active: boolean
}

export type SectionTitles = Record<AgendaSectionKey, { en: string; rw: string }>

export interface ThemeColors {
  primary: string
  primaryDark: string
  accent: string
  accentSoft: string
  background: string
  surface: string
  surfaceAlt: string
  ink: string
  inkMuted: string
  border: string
  success: string
  danger: string
  onPrimary: string
  onAccent: string
}

export interface Theme {
  name: string
  colors: ThemeColors
  fonts: { heading: string; body: string; script: string }
  radius: { sm: string; md: string; lg: string; pill: string }
  heroOverlay: number
}

export interface LocalisedCopy {
  heroKicker: string
  heroTagline: string
  churchName: string
  receptionVenue: string
  invitation: string
  galleryTitle: string
  gallerySubtitle: string
  uploadTitle: string
  uploadSubtitle: string
  thankYou: string
}

export interface SiteContent {
  brideName: string
  groomName: string
  hashtag: string
  weddingDate: string
  en: LocalisedCopy
  rw: LocalisedCopy
  flags: {
    uploadsOpen: boolean
    galleryPublic: boolean
    showGuestNames: boolean
  }
}

export interface SiteImage {
  id: number
  slot: string
  file_url: string
  thumb_url: string | null
  caption_en: string | null
  caption_rw: string | null
  sort_order: number
  is_active: boolean
}

export interface SiteConfig {
  theme: Theme
  content: SiteContent
  images: Record<string, SiteImage[]>
}

export interface GalleryItem {
  id: number
  kind: UploadKind
  message: string | null
  uploader_name: string | null
  file_url: string | null
  thumb_url: string | null
  width: number | null
  height: number | null
  created_at: string
}

export interface AdminUpload extends GalleryItem {
  status: UploadStatus
  phone_number: string | null
  mime_type: string | null
  size_bytes: number | null
  ip_address: string | null
  reviewed_at: string | null
  review_note: string | null
  reviewed_by: string | null
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  has_more: boolean
}

export interface UploadStats {
  pending: number
  approved: number
  rejected: number
  photos: number
  videos: number
  texts: number
  total: number
  storage_used_bytes: number
  storage_free_bytes: number
}

export interface GalleryStats {
  photos: number
  videos: number
  messages: number
  total: number
}

export interface AdminUser {
  id: number
  email: string
  full_name: string
  role: AdminRole
  is_active: boolean
  created_at: string
  last_login_at: string | null
}
