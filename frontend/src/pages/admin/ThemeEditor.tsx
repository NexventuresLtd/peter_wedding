import { useEffect, useState } from 'react'

import { Spinner, useToast } from '../../components/ui'
import { useSite } from '../../context/SiteContext'
import { api } from '../../lib/api'
import { classNames } from '../../lib/format'
import type { QrPlacement, SiteConfig, Theme, ThemeColors } from '../../lib/types'

const COLOR_FIELDS: { key: keyof ThemeColors; label: string; hint: string }[] = [
  { key: 'primary', label: 'Primary', hint: 'Headings, buttons, footer' },
  { key: 'primaryDark', label: 'Primary (dark)', hint: 'Hover state' },
  { key: 'accent', label: 'Accent', hint: 'Gold details, dividers' },
  { key: 'accentSoft', label: 'Accent (soft)', hint: 'Tints and highlights' },
  { key: 'background', label: 'Page background', hint: 'The base canvas' },
  { key: 'surface', label: 'Card surface', hint: 'Cards and panels' },
  { key: 'surfaceAlt', label: 'Alternate band', hint: 'Section stripes' },
  { key: 'ink', label: 'Body text', hint: 'Main reading colour' },
  { key: 'inkMuted', label: 'Muted text', hint: 'Captions, hints' },
  { key: 'border', label: 'Borders', hint: 'Hairlines' },
  { key: 'onPrimary', label: 'Text on primary', hint: 'Must contrast primary' },
  { key: 'onAccent', label: 'Text on accent', hint: 'Must contrast accent' },
]

/** Hero text sits on a photo, so it is themed on its own. */
const HERO_FIELDS: { key: keyof ThemeColors; label: string; hint: string }[] = [
  { key: 'heroTitle', label: 'Names', hint: 'The big script names, and the date' },
  { key: 'heroKicker', label: 'Accents', hint: 'Kicker, ampersand, countdown, frame' },
  { key: 'heroText', label: 'Body text', hint: 'Tagline, venue, buttons' },
]

/** Ready-made palettes so the couple can re-skin the site in one click. */
const PRESETS: { name: string; colors: Partial<ThemeColors> }[] = [
  {
    name: 'Champagne & Emerald',
    colors: {
      primary: '#0F4C3A',
      primaryDark: '#0A3428',
      accent: '#C9A227',
      accentSoft: '#E8D9A8',
      background: '#FDFBF7',
      surface: '#FFFFFF',
      surfaceAlt: '#F6F1E7',
      ink: '#1A1A1A',
      inkMuted: '#6B6459',
      border: '#E7DFD1',
      onPrimary: '#FDFBF7',
      onAccent: '#1A1A1A',
    },
  },
  {
    name: 'Blush & Charcoal',
    colors: {
      primary: '#5C4742',
      primaryDark: '#3F312D',
      accent: '#D4A5A5',
      accentSoft: '#F2DEDE',
      background: '#FFF8F3',
      surface: '#FFFFFF',
      surfaceAlt: '#FBEFE8',
      ink: '#2B2B2B',
      inkMuted: '#7D6C66',
      border: '#EEDDD5',
      onPrimary: '#FFF8F3',
      onAccent: '#2B2B2B',
    },
  },
  {
    name: 'Royal Navy & Gold',
    colors: {
      primary: '#1B2A4A',
      primaryDark: '#111C33',
      accent: '#D4AF37',
      accentSoft: '#EEDFAE',
      background: '#FBFCFE',
      surface: '#FFFFFF',
      surfaceAlt: '#EFF2F7',
      ink: '#15181F',
      inkMuted: '#5D6779',
      border: '#DDE3EC',
      onPrimary: '#FBFCFE',
      onAccent: '#15181F',
    },
  },
  {
    name: 'Terracotta & Sand',
    colors: {
      primary: '#8C3B25',
      primaryDark: '#68291A',
      accent: '#D98E4A',
      accentSoft: '#F3DCC2',
      background: '#FDF8F2',
      surface: '#FFFFFF',
      surfaceAlt: '#F7ECDF',
      ink: '#26190F',
      inkMuted: '#7A6653',
      border: '#EBDCC8',
      onPrimary: '#FDF8F2',
      onAccent: '#26190F',
    },
  },
]

const QR_PLACEMENTS: { key: QrPlacement; label: string; hint: string }[] = [
  { key: 'section', label: 'Own section', hint: 'A full-width band above the footer. The most prominent.' },
  { key: 'hero', label: 'In the hero', hint: 'Under the buttons on the opening screen. Seen first.' },
  { key: 'footer', label: 'In the footer', hint: 'Discreet, at the very bottom of every page.' },
  { key: 'hidden', label: 'Hidden', hint: 'No code on the site. The /upload page still works.' },
]

export function ThemeEditor() {
  const { refresh, previewTheme } = useSite()
  const { notify } = useToast()

  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [draft, setDraft] = useState<Theme | null>(null)
  const [content, setContent] = useState<SiteConfig['content'] | null>(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'colours' | 'content'>('colours')

  useEffect(() => {
    api
      .adminSite()
      .then((loaded) => {
        setConfig(loaded)
        setDraft(loaded.theme)
        setContent(loaded.content)
      })
      .catch((err) => notify(err.message, 'error'))
  }, [notify])

  // Paint the draft live, and put the saved theme back when leaving the page.
  useEffect(() => {
    if (draft) previewTheme(draft)
    return () => previewTheme(null)
  }, [draft, previewTheme])

  const setColor = (key: keyof ThemeColors, value: string) =>
    setDraft((current) =>
      current ? { ...current, colors: { ...current.colors, [key]: value } } : current,
    )

  const applyPreset = (preset: (typeof PRESETS)[number]) =>
    setDraft((current) =>
      current
        ? { ...current, name: preset.name, colors: { ...current.colors, ...preset.colors } }
        : current,
    )

  const save = async () => {
    if (!draft || !content) return
    setSaving(true)
    try {
      const saved = await api.saveSite({ theme: draft, content })
      setConfig(saved)
      setDraft(saved.theme)
      setContent(saved.content)
      previewTheme(null)
      await refresh()
      notify('Saved. The public site has been updated.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not save.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    setSaving(true)
    try {
      const saved = await api.resetTheme()
      setConfig(saved)
      setDraft(saved.theme)
      previewTheme(null)
      await refresh()
      notify('Theme reset to the original palette.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not reset.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!draft || !content || !config) {
    return (
      <div className="flex justify-center py-20 text-primary">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div>
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-primary sm:text-3xl">Theme &amp; content</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Changes preview live on this page. Nothing goes public until you save.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={reset} disabled={saving} className="btn-ghost text-sm">
            Reset theme
          </button>
          <button type="button" onClick={save} disabled={saving} className="btn-primary">
            {saving && <Spinner className="h-4 w-4" />}
            Save changes
          </button>
        </div>
      </header>

      <div className="mb-6 flex gap-2">
        {(['colours', 'content'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={classNames(
              'rounded-pill px-5 py-2 text-sm font-medium capitalize transition-colors',
              tab === key
                ? 'bg-primary text-on-primary'
                : 'border border-hairline bg-surface text-ink-muted hover:text-ink',
            )}
          >
            {key}
          </button>
        ))}
      </div>

      {tab === 'colours' ? (
        <div className="space-y-7">
          <section className="card p-6">
            <h2 className="mb-4 font-heading text-lg text-primary">Palettes</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={classNames(
                    'rounded-md border p-3 text-left transition-all hover:shadow-md',
                    draft.name === preset.name
                      ? 'border-accent ring-2 ring-accent/30'
                      : 'border-hairline',
                  )}
                >
                  <div className="mb-2.5 flex gap-1.5">
                    {(['primary', 'accent', 'surfaceAlt', 'background'] as const).map(
                      (token) => (
                        <span
                          key={token}
                          className="h-7 flex-1 rounded-sm border border-black/5"
                          style={{ background: preset.colors[token] }}
                        />
                      ),
                    )}
                  </div>
                  <p className="text-sm font-medium text-ink">{preset.name}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="mb-1 font-heading text-lg text-primary">Individual colours</h2>
            <p className="mb-5 text-sm text-ink-muted">
              Keep text and background pairs far apart in lightness so the site stays
              readable.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {COLOR_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <input
                    type="color"
                    value={draft.colors[field.key] ?? '#000000'}
                    onChange={(event) => setColor(field.key, event.target.value)}
                    className="h-11 w-11 shrink-0 cursor-pointer rounded-sm border border-hairline bg-transparent p-0.5"
                    aria-label={field.label}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{field.label}</p>
                    <input
                      type="text"
                      value={draft.colors[field.key] ?? ''}
                      onChange={(event) => setColor(field.key, event.target.value)}
                      className="w-full bg-transparent font-mono text-xs uppercase text-ink-muted focus:outline-none"
                    />
                    <p className="truncate text-[11px] text-ink-muted/70">{field.hint}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="mb-1 font-heading text-lg text-primary">Hero text</h2>
            <p className="mb-5 text-sm text-ink-muted">
              These only affect the hero. Because the text sits over a photo it
              needs its own colours — changing the page palette leaves it alone.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {HERO_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <input
                    type="color"
                    value={draft.colors[field.key] ?? '#ffffff'}
                    onChange={(event) => setColor(field.key, event.target.value)}
                    className="h-11 w-11 shrink-0 cursor-pointer rounded-sm border border-hairline bg-transparent p-0.5"
                    aria-label={field.label}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{field.label}</p>
                    <input
                      type="text"
                      value={draft.colors[field.key] ?? ''}
                      onChange={(event) => setColor(field.key, event.target.value)}
                      className="w-full bg-transparent font-mono text-xs uppercase text-ink-muted focus:outline-none"
                    />
                    <p className="truncate text-[11px] text-ink-muted/70">{field.hint}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview against a dark ground, roughly as the hero renders. */}
            <div
              className="mt-5 rounded-md p-6 text-center"
              style={{ background: 'linear-gradient(160deg,#123,#061c15)' }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.3em]"
                style={{ color: draft.colors.heroKicker }}
              >
                We are getting married
              </p>
              <p
                className="mt-2 font-script text-4xl"
                style={{ color: draft.colors.heroTitle }}
              >
                Peter <span style={{ color: draft.colors.heroKicker }}>&amp;</span> Yvette
              </p>
              <p className="mt-2 text-sm" style={{ color: draft.colors.heroText }}>
                Join us as we celebrate the beginning of our forever.
              </p>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 font-heading text-lg text-primary">Hero overlay</h2>
            <p className="mb-4 text-sm text-ink-muted">
              How much the hero photo is darkened so the names stay legible.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={0.9}
                step={0.05}
                value={draft.heroOverlay}
                onChange={(event) =>
                  setDraft({ ...draft, heroOverlay: Number(event.target.value) })
                }
                className="flex-1 accent-[color:rgb(var(--c-primary))]"
              />
              <span className="w-12 text-right font-mono text-sm text-ink-muted tabular-nums">
                {Math.round(draft.heroOverlay * 100)}%
              </span>
            </div>
          </section>
        </div>
      ) : (
        <ContentEditor content={content} onChange={setContent} />
      )}
    </div>
  )
}

function ContentEditor({
  content,
  onChange,
}: {
  content: SiteConfig['content']
  onChange: (next: SiteConfig['content']) => void
}) {
  const set = (patch: Partial<SiteConfig['content']>) => onChange({ ...content, ...patch })
  const setLang = (lang: 'en' | 'rw', patch: Record<string, string>) =>
    onChange({ ...content, [lang]: { ...content[lang], ...patch } })

  const LANG_FIELDS: { key: keyof SiteConfig['content']['en']; label: string; long?: boolean }[] = [
    { key: 'heroKicker', label: 'Hero kicker' },
    { key: 'heroTagline', label: 'Hero tagline', long: true },
    { key: 'churchName', label: 'Church name' },
    { key: 'receptionVenue', label: 'Reception venue' },
    { key: 'invitation', label: 'Invitation paragraph', long: true },
    { key: 'galleryTitle', label: 'Gallery title' },
    { key: 'gallerySubtitle', label: 'Gallery subtitle', long: true },
    { key: 'uploadTitle', label: 'Upload title' },
    { key: 'uploadSubtitle', label: 'Upload subtitle', long: true },
    { key: 'thankYou', label: 'Footer thank-you' },
  ]

  return (
    <div className="space-y-7">
      <section className="card p-6">
        <h2 className="mb-5 font-heading text-lg text-primary">The couple</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Groom's name"
            value={content.groomName}
            onChange={(v) => set({ groomName: v })}
          />
          <Field
            label="Bride's name"
            value={content.brideName}
            onChange={(v) => set({ brideName: v })}
          />
          <Field
            label="Hashtag"
            value={content.hashtag}
            onChange={(v) => set({ hashtag: v })}
          />
          <div>
            <label className="field-label">Logo text</label>
            <input
              type="text"
              value={content.logoText}
              onChange={(event) => set({ logoText: event.target.value })}
              placeholder="P & Y"
              className="field-input"
            />
            <p className="field-hint">
              Shown in the navigation bar. Leave blank for the couple's initials.
              An uploaded logo image replaces it.
            </p>
          </div>
          <div>
            <label className="field-label">Wedding date</label>
            <input
              type="date"
              value={content.weddingDate}
              onChange={(event) => set({ weddingDate: event.target.value })}
              className="field-input"
            />
            <p className="field-hint">Drives the date line and the countdown.</p>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-1 font-heading text-lg text-primary">Upload QR code</h2>
        <p className="mb-5 text-sm text-ink-muted">
          Where the scannable code appears for guests on the home page.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QR_PLACEMENTS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => set({ qrPlacement: option.key })}
              className={classNames(
                'rounded-md border p-4 text-left transition-all hover:shadow-md',
                content.qrPlacement === option.key
                  ? 'border-accent bg-accent/[0.06] ring-2 ring-accent/30'
                  : 'border-hairline',
              )}
            >
              <p className="text-sm font-medium text-ink">{option.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{option.hint}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-5 font-heading text-lg text-primary">Visibility</h2>
        <div className="space-y-4">
          <Toggle
            label="Accept new uploads"
            hint="Turn off once the celebrations are over."
            checked={content.flags.uploadsOpen}
            onChange={(v) => set({ flags: { ...content.flags, uploadsOpen: v } })}
          />
          <Toggle
            label="Gallery visible to the public"
            hint="Off hides every approved item from guests."
            checked={content.flags.galleryPublic}
            onChange={(v) => set({ flags: { ...content.flags, galleryPublic: v } })}
          />
          <Toggle
            label="Show guest names in the gallery"
            hint="Off displays contributions without attribution."
            checked={content.flags.showGuestNames}
            onChange={(v) => set({ flags: { ...content.flags, showGuestNames: v } })}
          />
        </div>
      </section>

      {(['en', 'rw'] as const).map((lang) => (
        <section key={lang} className="card p-6">
          <h2 className="mb-5 font-heading text-lg text-primary">
            {lang === 'en' ? 'English copy' : 'Kinyarwanda copy'}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {LANG_FIELDS.map((field) => (
              <div key={field.key} className={field.long ? 'sm:col-span-2' : ''}>
                <label className="field-label">{field.label}</label>
                {field.long ? (
                  <textarea
                    rows={3}
                    value={content[lang][field.key]}
                    onChange={(event) =>
                      setLang(lang, { [field.key]: event.target.value })
                    }
                    className="field-input resize-y text-sm"
                  />
                ) : (
                  <input
                    type="text"
                    value={content[lang][field.key]}
                    onChange={(event) =>
                      setLang(lang, { [field.key]: event.target.value })
                    }
                    className="field-input text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-input"
      />
    </div>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[color:rgb(var(--c-primary))]"
      />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-xs text-ink-muted">{hint}</span>
      </span>
    </label>
  )
}
