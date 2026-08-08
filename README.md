# Peter & Yvette — Wedding Site

A bilingual (English / Kinyarwanda) wedding website with a guest media wall.
Guests scan a QR code, upload photos, videos or written wishes from their phones,
and an admin approves each item before it appears publicly.

- **Frontend** — React 19 + TypeScript + Vite + Tailwind
- **Backend** — FastAPI + SQLAlchemy 2 + PostgreSQL (`peterwedding`)
- **Media** — stored on local disk, served from `/media`

---

## Quick start

### 1. Database

```bash
createdb peterwedding          # or: psql -U postgres -c "CREATE DATABASE peterwedding;"
```

### 2. Backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

cp .env.example .env           # then edit DATABASE_URL, SECRET_KEY, admin credentials
.venv/bin/python -m app.seed   # creates tables, the first admin, theme and agenda
.venv/bin/uvicorn app.main:app --reload
```

API on http://127.0.0.1:8000 · interactive docs at http://127.0.0.1:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Site on http://127.0.0.1:5173 · admin at http://127.0.0.1:5173/admin

Vite proxies `/api` and `/media` to the backend, so both dev servers behave as
one origin.

---

## Before the wedding — a checklist

Everything below is done from the admin console; no code changes needed.

1. **Sign in** at `/admin` with the credentials from `.env`, then change the
   password (the seed script warns if you are still on the default).
2. **Set the wedding date** — *Theme & content → Content*. This drives the date
   line in the hero and the countdown. It ships blank, so both stay hidden
   until you fill it in.
3. **Upload the couple's photos** — *Wedding images*:
   - `hero` — the full-screen backdrop (landscape). Without one the hero falls
     back to a deep gradient, which looks deliberate rather than broken.
   - `couple` — the portrait beside the invitation text on the home page.
4. **Check the venue names and invitation copy** in both languages.
5. **Set `PUBLIC_SITE_URL`** in `backend/.env` to the real domain *before*
   printing the QR code — the code encodes `PUBLIC_SITE_URL/upload`.
6. **Print the QR code** from `GET /api/qr?scale=20` (a PNG), or screenshot the
   panel at the bottom of the home page.
7. **Add moderator accounts** for whoever will clear the queue on the day
   (*Admin users*) so they can approve without full admin rights.

---

## How moderation works

Every guest upload lands as `pending` and is invisible to the public. The
gallery endpoint only ever returns `approved` items, and **phone numbers are
never included in any public response** — they exist solely so the couple knows
who to thank.

| Role | Can do |
| --- | --- |
| `moderator` | Review the queue: approve, reject, bulk actions |
| `admin` | The above, plus theme, content, images, agenda, and permanent deletion |
| `superadmin` | The above, plus managing admin accounts |

Rejecting hides an item but keeps the file. Deleting removes the row *and* the
file from disk, and is restricted to `admin` and above.

Two kill switches live in *Theme & content → Content*:
`Accept new uploads` closes intake, and `Gallery visible to the public` hides
everything already approved.

---

## Phone numbers

| Upload type | Phone number |
| --- | --- |
| Photo | Optional |
| Video | Optional |
| Written message | **Required** |

Numbers are normalised on the way in (`+250 788 123 456` → `+250788123456`) and
are searchable in the moderation queue.

---

## The agenda

Seeded from the couple's English and Kinyarwanda programme documents — 13
entries across three sections (church ceremony, reception, after party), each
stored with both languages side by side.

Edit it at *Admin → Agenda*. Bullet points are plain text, one per line; prefix
a line with `- ` to nest it under the bullet above (used for the traditional
ceremony sub-items). *Restore original* re-seeds the programme exactly as
supplied.

---

## Theming

The palette lives in the database, not the stylesheet. `SiteContext` converts
each theme colour to RGB channels and writes them into CSS custom properties on
`:root`; Tailwind reads those through `rgb(var(--c-primary) / <alpha-value>)`,
so opacity utilities such as `bg-primary/10` keep working. Saving a theme in the
admin console repaints the entire site on the next load — no rebuild.

Four palettes ship ready to use (Champagne & Emerald, Blush & Charcoal, Royal
Navy & Gold, Terracotta & Sand), and every colour can be overridden
individually. *Reset theme* restores the original.

---

## Project layout

```
backend/
  app/
    main.py           FastAPI app, CORS, /media static mount
    models.py         admin_users, uploads, site_settings, site_images, agenda_items
    schemas.py        request/response models, phone validation
    security.py       bcrypt hashing, JWT issue/verify
    deps.py           auth dependency + role gate factory
    storage.py        disk writes, size limits, EXIF rotation, thumbnails
    site_config.py    theme/content read-merge-write
    defaults.py       default theme, copy, and the seeded agenda
    seed.py           idempotent bootstrap
    routers/          public, uploads, auth, admin_*
  uploads/            guest/ and site/ media (gitignored)

frontend/src/
  context/            SiteContext (theme), LangContext, AuthContext
  components/         Nav, Hero, Agenda, Gallery, QrPanel, UploadForm, ui, icons
  pages/              Home, GalleryPage, UploadPage, NotFound
  pages/admin/        AdminLayout, Moderation, ThemeEditor, ImagesManager,
                      AgendaEditor, UsersManager
  lib/                api client, types, formatters
  i18n/strings.ts     UI chrome in both languages
```

---

## Deploying

1. `cd frontend && npm run build` → serve `dist/` from any static host or Nginx.
2. Run the API behind a real server:
   `uvicorn app.main:app --host 0.0.0.0 --port 8000` (or gunicorn + uvicorn workers).
3. Point `/api` and `/media` at the API from your reverse proxy.
4. In `backend/.env` set a strong `SECRET_KEY`, the real `PUBLIC_SITE_URL`, and
   `CORS_ORIGINS` to the production domain.
5. Back up `backend/uploads/` — it holds every guest photo and video, and those
   are irreplaceable.

Upload limits default to 15 MB per photo and 200 MB per video
(`MAX_IMAGE_MB` / `MAX_VIDEO_MB`). If you put Nginx in front, raise
`client_max_body_size` to match or large videos will fail at the proxy.

---

Powered by [nexventures.net](https://nexventures.net)
