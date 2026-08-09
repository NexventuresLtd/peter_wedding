import type {
  AdminUpload,
  AdminUser,
  AgendaItem,
  GalleryItem,
  GalleryStats,
  Paginated,
  SectionTitles,
  SiteConfig,
  SiteImage,
  UploadStats,
  UploadStatus,
} from './types'

const TOKEN_KEY = 'pw_admin_token'

/**
 * Absolute origin of the backend, or '' when it is served from this same
 * origin (the default — a reverse proxy forwards /api and /media).
 *
 * Set VITE_API_BASE_URL only for split-origin deploys. Baked in at build time,
 * so a change requires a rebuild.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

/**
 * Resolve a server-relative path ("/media/…", "/api/qr") against API_BASE.
 *
 * Use this for anything the browser fetches directly — <img src>, <video src>,
 * XHR — because those bypass the api client below. Absolute URLs and data URIs
 * are passed through untouched.
 */
export function assetUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) return path
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Pull a human-readable message out of FastAPI's error shapes. */
async function toError(response: Response): Promise<ApiError> {
  let detail = `Request failed (${response.status})`
  try {
    const body = await response.json()
    if (typeof body.detail === 'string') {
      detail = body.detail
    } else if (Array.isArray(body.detail) && body.detail.length > 0) {
      // Pydantic validation errors: surface the first field message.
      const first = body.detail[0]
      const field = Array.isArray(first.loc) ? first.loc.at(-1) : null
      detail = field ? `${field}: ${first.msg}` : first.msg
    }
  } catch {
    /* Non-JSON error body — keep the generic message. */
  }
  return new ApiError(detail, response.status)
}

interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
  signal?: AbortSignal
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, signal } = options
  const headers: Record<string, string> = {}
  const isFormData = body instanceof FormData

  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = tokenStore.get()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    signal,
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401 && auth) {
    // The session expired or was revoked — drop it so the UI redirects to login.
    tokenStore.clear()
    window.dispatchEvent(new Event('pw:unauthorised'))
  }

  if (!response.ok) throw await toError(response)
  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}

const query = (params: Record<string, string | number | undefined | null>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  }
  const serialised = search.toString()
  return serialised ? `?${serialised}` : ''
}

// ------------------------------------------------------------------ public API

export const api = {
  site: () => request<SiteConfig>('/api/site'),
  agenda: () => request<AgendaItem[]>('/api/agenda'),
  agendaSections: () => request<SectionTitles>('/api/agenda/sections'),
  galleryStats: () => request<GalleryStats>('/api/gallery/stats'),
  uploadStatus: () =>
    request<{ open: boolean; galleryPublic: boolean }>('/api/uploads/status'),
  qrTarget: () => request<{ url: string }>('/api/qr/target'),

  gallery: (params: { kind?: string; page?: number; per_page?: number } = {}) =>
    request<Paginated<GalleryItem>>(`/api/gallery${query(params)}`),

  uploadText: (payload: {
    message: string
    phone_number: string
    uploader_name?: string
  }) => request<GalleryItem>('/api/uploads/text', { method: 'POST', body: payload }),

  uploadMedia: (form: FormData) =>
    request<GalleryItem>('/api/uploads/media', { method: 'POST', body: form }),

  // ----------------------------------------------------------------- admin API

  login: async (email: string, password: string) => {
    // OAuth2 password flow expects form encoding, not JSON.
    const form = new URLSearchParams({ username: email, password })
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })
    if (!response.ok) throw await toError(response)
    const data = (await response.json()) as { access_token: string }
    tokenStore.set(data.access_token)
    return data
  },

  me: () => request<AdminUser>('/api/auth/me', { auth: true }),

  changePassword: (current_password: string, new_password: string) =>
    request<void>('/api/auth/change-password', {
      method: 'POST',
      auth: true,
      body: { current_password, new_password },
    }),

  adminUploads: (
    params: {
      status?: string
      kind?: string
      search?: string
      page?: number
      per_page?: number
    } = {},
  ) => request<Paginated<AdminUpload>>(`/api/admin/uploads${query(params)}`, { auth: true }),

  adminStats: () => request<UploadStats>('/api/admin/uploads/stats', { auth: true }),

  reviewUpload: (id: number, status: UploadStatus, review_note?: string) =>
    request<AdminUpload>(`/api/admin/uploads/${id}`, {
      method: 'PATCH',
      auth: true,
      body: { status, review_note: review_note ?? null },
    }),

  bulkReview: (ids: number[], status: UploadStatus) =>
    request<{ updated: number }>('/api/admin/uploads/bulk', {
      method: 'POST',
      auth: true,
      body: { ids, status },
    }),

  deleteUpload: (id: number) =>
    request<void>(`/api/admin/uploads/${id}`, { method: 'DELETE', auth: true }),

  adminSite: () => request<SiteConfig>('/api/admin/site', { auth: true }),

  saveSite: (payload: { theme?: unknown; content?: unknown }) =>
    request<SiteConfig>('/api/admin/site', { method: 'PUT', auth: true, body: payload }),

  resetTheme: () =>
    request<SiteConfig>('/api/admin/site/theme/reset', { method: 'POST', auth: true }),

  adminImages: () => request<SiteImage[]>('/api/admin/site/images', { auth: true }),

  addImage: (form: FormData) =>
    request<SiteImage>('/api/admin/site/images', { method: 'POST', auth: true, body: form }),

  updateImage: (id: number, payload: Partial<SiteImage>) =>
    request<SiteImage>(`/api/admin/site/images/${id}`, {
      method: 'PATCH',
      auth: true,
      body: payload,
    }),

  deleteImage: (id: number) =>
    request<void>(`/api/admin/site/images/${id}`, { method: 'DELETE', auth: true }),

  adminAgenda: () => request<AgendaItem[]>('/api/admin/agenda', { auth: true }),

  createAgendaItem: (payload: Partial<AgendaItem>) =>
    request<AgendaItem>('/api/admin/agenda', { method: 'POST', auth: true, body: payload }),

  updateAgendaItem: (id: number, payload: Partial<AgendaItem>) =>
    request<AgendaItem>(`/api/admin/agenda/${id}`, {
      method: 'PATCH',
      auth: true,
      body: payload,
    }),

  deleteAgendaItem: (id: number) =>
    request<void>(`/api/admin/agenda/${id}`, { method: 'DELETE', auth: true }),

  reorderAgenda: (ordered_ids: number[]) =>
    request<AgendaItem[]>('/api/admin/agenda/reorder', {
      method: 'POST',
      auth: true,
      body: { ordered_ids },
    }),

  restoreAgenda: () =>
    request<AgendaItem[]>('/api/admin/agenda/restore-defaults', {
      method: 'POST',
      auth: true,
    }),

  adminUsers: () => request<AdminUser[]>('/api/admin/users', { auth: true }),

  createUser: (payload: {
    email: string
    full_name: string
    password: string
    role: string
  }) => request<AdminUser>('/api/admin/users', { method: 'POST', auth: true, body: payload }),

  updateUser: (id: number, payload: Record<string, unknown>) =>
    request<AdminUser>(`/api/admin/users/${id}`, {
      method: 'PATCH',
      auth: true,
      body: payload,
    }),

  deleteUser: (id: number) =>
    request<void>(`/api/admin/users/${id}`, { method: 'DELETE', auth: true }),
}
