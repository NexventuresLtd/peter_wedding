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
python -m app.seed   # creates the database, tables, admin, theme and agenda
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
cp .env.example .env           # optional — the defaults already point at :8000
npm run dev
```

Site on http://127.0.0.1:5173 · admin at http://127.0.0.1:5173/admin

Vite proxies `/api` and `/media` to the backend, so both dev servers behave as
one origin.

### Where the backend URL is configured

Two variables, one on each side, and **they must agree**:

| Side | Variable | Meaning |
| --- | --- | --- |
| `backend/.env` | `API_PREFIX` | Path every endpoint *and* the media mount live under. Default `/api`. |
| `frontend/.env` | `VITE_API_BASE_URL` | What the browser puts in front of every request. Default `/api`. |
| `frontend/.env` | `VITE_API_TARGET` | Dev only — where `npm run dev` proxies. Never enters the build. |

Set both to the same path and everything follows: endpoints, media URLs, the
QR image and the OpenAPI docs all relocate together.

```
API_PREFIX=/api/v1          # backend/.env
VITE_API_BASE_URL=/api/v1   # frontend/.env
```

If the API is on a *different host*, give `VITE_API_BASE_URL` the full origin
including the path (`https://api.example.com/api/v1`) and add the site's origin
to `CORS_ORIGINS` in `backend/.env`.

> **`VITE_API_BASE_URL` is baked into the bundle at build time.** Editing
> `frontend/.env` on a deployed server does nothing on its own — you must run
> `npm run build` again and redeploy `dist/`. If your requests never reach the
> backend and nothing appears in its log, this is almost always why.

Do **not** use FastAPI's `root_path` for this. It only affects generated
documentation URLs; it does not move the routes, so the app would still serve
`/api/site` while your proxy asks for `/api/v1/site`.

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

1. Set `API_PREFIX` in `backend/.env` and the matching `VITE_API_BASE_URL` in
   `frontend/.env`.
2. `cd frontend && npm run build` → deploy `dist/`.
3. Run the API: `uvicorn app.main:app --host 127.0.0.1 --port 8000`
   (or gunicorn with uvicorn workers, behind systemd).
4. In `backend/.env` set a strong `SECRET_KEY`, the real `PUBLIC_SITE_URL`
   (the QR code encodes it), and `CORS_ORIGINS`.
5. Back up `backend/uploads/` — it holds every guest photo and video, and those
   are irreplaceable.

### Nginx

This example publishes the site at `https://peterandyvette.com/` and the API at
`https://peterandyvette.com/api/v1/`, matching `API_PREFIX=/api/v1`.

```nginx
server {
    server_name peterandyvette.com;
    root /var/www/peterandyvette/dist;

    # Serve media straight off disk. Without this block every photo and video
    # is streamed through Python, which is slow and ties up a worker for the
    # length of the download.
    location /api/v1/media/ {
        alias /srv/peterwedding/backend/uploads/;
        try_files $uri =404;
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # The API. `proxy_pass` has NO trailing path, which is what preserves the
    # /api/v1 prefix — the backend expects to receive it, not to have it
    # stripped. Adding a trailing slash here is the usual cause of 404s.
    location /api/v1/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Must be >= MAX_VIDEO_MB or large uploads fail at the proxy, before
        # they ever reach the app.
        client_max_body_size 210m;
        proxy_request_buffering off;
    }

    # SPA fallback — must come last so it does not swallow the routes above.
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

`X-Forwarded-For` matters: it is what the moderation queue records as the
uploader's IP. Without it every upload appears to come from `127.0.0.1`.

Upload limits default to 15 MB per photo and 200 MB per video
(`MAX_IMAGE_MB` / `MAX_VIDEO_MB` in `backend/.env`).

---

Powered by [nexventures.net](https://nexventures.net)
