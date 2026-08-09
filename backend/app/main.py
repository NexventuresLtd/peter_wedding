from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from starlette.types import Scope

from .config import settings
from .database import engine
from .routers import (
    admin_agenda,
    admin_site,
    admin_uploads,
    admin_users,
    auth,
    public,
    uploads,
)
from .storage import ensure_upload_dirs

API_PREFIX = settings.normalised_api_prefix


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_upload_dirs()
    yield


app = FastAPI(
    title="Peter & Yvette — Wedding API",
    description=(
        "Public wedding site: bilingual agenda, guest photo/video/message "
        "uploads with admin moderation, and site theming."
    ),
    version="1.0.0",
    lifespan=lifespan,
    # Docs live under the same prefix, so a single reverse-proxy location
    # covers the whole API.
    docs_url=f"{API_PREFIX}/docs",
    redoc_url=f"{API_PREFIX}/redoc",
    openapi_url=f"{API_PREFIX}/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-QR-Target"],
)

# Every router is declared without the `/api` prefix; it is applied once here
# so the whole API can be republished under a different path (e.g. /api/v1)
# by changing API_PREFIX alone.
for module in (
    public,
    uploads,
    auth,
    admin_uploads,
    admin_site,
    admin_agenda,
    admin_users,
):
    app.include_router(module.router, prefix=API_PREFIX)


health_router = APIRouter(tags=["public"])


@health_router.get("/health")
def health() -> dict:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        database = "up"
    except Exception as exc:  # noqa: BLE001 — surfaced verbatim for ops
        database = f"down: {exc.__class__.__name__}"

    return {"status": "ok", "database": database, "api_prefix": API_PREFIX or "/"}


app.include_router(health_router, prefix=API_PREFIX)


class ImmutableStaticFiles(StaticFiles):
    """Static media with a one-year immutable cache.

    Stored filenames are random tokens and their contents never change, so a
    given URL can be cached indefinitely. Without this, every guest re-validates
    every thumbnail on every visit.
    """

    def file_response(self, *args, **kwargs):
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response


# Guest and site media, mounted under the API prefix so one proxy rule serves
# both the JSON API and the files. Approved-only filtering happens at the API
# layer; the paths themselves are unguessable random tokens.
ensure_upload_dirs()
app.mount(
    f"{API_PREFIX}/media",
    ImmutableStaticFiles(directory=settings.upload_path),
    name="media",
)


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": str(exc)})
