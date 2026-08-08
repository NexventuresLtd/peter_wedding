from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

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
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-QR-Target"],
)

for module in (
    public,
    uploads,
    auth,
    admin_uploads,
    admin_site,
    admin_agenda,
    admin_users,
):
    app.include_router(module.router)

# Guest and site media. Approved-only filtering happens at the API layer; the
# file paths themselves are unguessable random tokens.
ensure_upload_dirs()
app.mount(
    "/media",
    StaticFiles(directory=settings.upload_path),
    name="media",
)


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.get("/api/health", tags=["public"])
def health() -> dict:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        database = "up"
    except Exception as exc:  # noqa: BLE001 — surfaced verbatim for ops
        database = f"down: {exc.__class__.__name__}"

    return {"status": "ok", "database": database}
