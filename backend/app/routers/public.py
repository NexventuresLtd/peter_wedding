"""Endpoints the wedding website calls without authentication."""

from __future__ import annotations

import io
import re

import qrcode
from PIL import Image, ImageOps
from fastapi import APIRouter, Depends, Query, Request, Response
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import RoundedModuleDrawer
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..defaults import SECTION_TITLES
from ..models import AgendaItem, Upload, UploadKind, UploadStatus
from ..schemas import AgendaItemOut, PaginatedUploads, SiteConfig
from ..serializers import upload_public
from ..site_config import build_site_config, get_content

router = APIRouter(tags=["public"])


@router.get("/site", response_model=SiteConfig)
def read_site_config(db: Session = Depends(get_db)) -> SiteConfig:
    """Theme, copy and curated imagery — everything needed to paint the site."""
    return build_site_config(db)


@router.get("/agenda", response_model=list[AgendaItemOut])
def read_agenda(db: Session = Depends(get_db)) -> list[AgendaItem]:
    return (
        db.query(AgendaItem)
        .filter(AgendaItem.is_active.is_(True))
        .order_by(AgendaItem.sort_order, AgendaItem.id)
        .all()
    )


@router.get("/agenda/sections")
def read_agenda_sections() -> dict:
    """Bilingual display titles for each agenda section."""
    return SECTION_TITLES


@router.get("/gallery", response_model=PaginatedUploads)
def read_gallery(
    db: Session = Depends(get_db),
    kind: UploadKind | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=24, ge=1, le=100),
) -> PaginatedUploads:
    """Approved guest contributions only.

    Returns an empty gallery — rather than 403 — when the couple has switched
    public viewing off, so the page degrades gracefully.
    """
    if not get_content(db).get("flags", {}).get("galleryPublic", True):
        return PaginatedUploads(
            items=[], total=0, page=page, per_page=per_page, has_more=False
        )

    query = db.query(Upload).filter(Upload.status == UploadStatus.approved)
    if kind is not None:
        query = query.filter(Upload.kind == kind)

    total = query.count()
    items = (
        query.order_by(Upload.created_at.desc(), Upload.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    show_names = get_content(db).get("flags", {}).get("showGuestNames", True)
    payload = []
    for item in items:
        public = upload_public(item)
        if not show_names:
            public.uploader_name = None
        payload.append(public)

    return PaginatedUploads(
        items=payload,
        total=total,
        page=page,
        per_page=per_page,
        has_more=page * per_page < total,
    )


@router.get("/gallery/stats")
def read_gallery_stats(db: Session = Depends(get_db)) -> dict:
    rows = (
        db.query(Upload.kind, func.count(Upload.id))
        .filter(Upload.status == UploadStatus.approved)
        .group_by(Upload.kind)
        .all()
    )
    counts = {kind.value: count for kind, count in rows}
    return {
        "photos": counts.get("photo", 0),
        "videos": counts.get("video", 0),
        "messages": counts.get("text", 0),
        "total": sum(counts.values()),
    }


def public_base_url(request: Request) -> str:
    """Origin the QR code should point at.

    PUBLIC_SITE_URL wins when set. Otherwise it is derived from the incoming
    request, honouring the proxy's forwarded headers — so a deployed site
    encodes its own domain even if nobody remembered to set the variable, and
    a code printed from staging never sends guests to localhost.
    """
    configured = settings.public_site_url.strip()
    if configured:
        return configured.rstrip("/")

    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = (
        request.headers.get("x-forwarded-host")
        or request.headers.get("host")
        or request.url.netloc
    )
    return f"{scheme}://{host}".rstrip("/")


HEX_COLOUR = re.compile(r"^#?([0-9a-fA-F]{6})$")


def _parse_hex(value: str, fallback: tuple[int, int, int]) -> tuple[int, int, int]:
    match = HEX_COLOUR.match(value.strip())
    if not match:
        return fallback
    digits = match.group(1)
    return tuple(int(digits[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


@router.get("/qr", response_class=Response)
def upload_qr_code(
    request: Request,
    target: str = Query(default="/upload", description="Path on the public site"),
    scale: int = Query(default=12, ge=4, le=40),
    fg: str = Query(default="#0F4C3A", description="Module colour, hex"),
    bg: str = Query(
        default="transparent",
        description="Background: 'transparent' or a hex colour",
    ),
) -> Response:
    """PNG QR code pointing guests at the upload page.

    Rendered server-side so the printed card and the on-screen code are always
    the same image. The background is transparent by default so the code can
    sit directly on the hero photo or a coloured band without a white plate.
    """
    url = f"{public_base_url(request)}/{target.lstrip('/')}"

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=scale,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)

    # Draw black-on-white first, then recolour. Deriving alpha from the
    # greyscale keeps the rounded modules' anti-aliased edges smooth instead of
    # producing the hard, speckled edge that keying out white would give.
    rendered = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(),
        fill_color="black",
        back_color="white",
    )
    mask = rendered.get_image().convert("L")

    foreground = _parse_hex(fg, (15, 76, 58))
    transparent = bg.strip().lower() in {"transparent", "none", ""}

    if transparent:
        # Ink where the mask is dark, clear where it is light.
        image = Image.new("RGBA", mask.size, (*foreground, 0))
        image.putalpha(ImageOps.invert(mask))
    else:
        background = _parse_hex(bg, (255, 255, 255))
        image = Image.composite(
            Image.new("RGB", mask.size, foreground),
            Image.new("RGB", mask.size, background),
            ImageOps.invert(mask),
        ).convert("RGBA")

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return Response(
        content=buffer.getvalue(),
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=3600",
            "X-QR-Target": url,
        },
    )


@router.get("/qr/target")
def qr_target(request: Request, target: str = Query(default="/upload")) -> dict:
    """The URL encoded in the QR code, for display next to it."""
    return {"url": f"{public_base_url(request)}/{target.lstrip('/')}"}
