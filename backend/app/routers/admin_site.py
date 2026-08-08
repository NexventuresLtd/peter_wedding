"""Theme, copy and curated wedding imagery."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_admin
from ..models import AdminUser, SiteImage
from ..schemas import SettingsUpdate, SiteConfig, SiteImageOut, SiteImageUpdate
from ..serializers import site_image
from ..site_config import build_site_config, grouped_images, reset_theme, save_content, save_theme
from ..storage import delete_media, save_media

router = APIRouter(prefix="/api/admin/site", tags=["admin:site"])

ALLOWED_SLOTS = {"hero", "couple", "gallery", "story", "invitation"}


@router.get("", response_model=SiteConfig)
def read_config(
    db: Session = Depends(get_db), _: AdminUser = Depends(require_admin)
) -> SiteConfig:
    """Admin view — includes images that are currently hidden from the public."""
    config = build_site_config(db)
    config.images = grouped_images(db, only_active=False)
    return config


@router.put("", response_model=SiteConfig)
def update_config(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin),
) -> SiteConfig:
    """Patch theme and/or content. Values are deep-merged onto what exists."""
    if payload.theme is not None:
        save_theme(db, payload.theme)
    if payload.content is not None:
        save_content(db, payload.content)
    return build_site_config(db)


@router.post("/theme/reset", response_model=SiteConfig)
def reset_site_theme(
    db: Session = Depends(get_db), _: AdminUser = Depends(require_admin)
) -> SiteConfig:
    reset_theme(db)
    return build_site_config(db)


@router.get("/images", response_model=list[SiteImageOut])
def list_images(
    db: Session = Depends(get_db), _: AdminUser = Depends(require_admin)
) -> list[SiteImageOut]:
    images = (
        db.query(SiteImage)
        .order_by(SiteImage.slot, SiteImage.sort_order, SiteImage.id)
        .all()
    )
    return [site_image(image) for image in images]


@router.post("/images", response_model=SiteImageOut, status_code=201)
def add_image(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin),
    file: UploadFile = File(...),
    slot: str = Form(...),
    caption_en: str | None = Form(default=None),
    caption_rw: str | None = Form(default=None),
    sort_order: int = Form(default=0),
) -> SiteImageOut:
    """Upload a wedding photo into a named slot (hero, couple, gallery…)."""
    if slot not in ALLOWED_SLOTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown slot '{slot}'. Choose one of: {', '.join(sorted(ALLOWED_SLOTS))}.",
        )

    stored = save_media(file, bucket="site")
    if stored["kind"] != "photo":
        delete_media(stored["file_path"], stored["thumb_path"])
        raise HTTPException(status_code=415, detail="Site imagery must be a photo.")

    record = SiteImage(
        slot=slot,
        file_path=stored["file_path"],
        thumb_path=stored["thumb_path"],
        caption_en=(caption_en or "").strip() or None,
        caption_rw=(caption_rw or "").strip() or None,
        sort_order=sort_order,
    )

    try:
        db.add(record)
        db.commit()
        db.refresh(record)
    except Exception:
        db.rollback()
        delete_media(stored["file_path"], stored["thumb_path"])
        raise

    return site_image(record)


@router.patch("/images/{image_id}", response_model=SiteImageOut)
def update_image(
    image_id: int,
    payload: SiteImageUpdate,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin),
) -> SiteImageOut:
    record = db.get(SiteImage, image_id)
    if record is None:
        raise HTTPException(status_code=404, detail="That image no longer exists.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)

    return site_image(record)


@router.delete("/images/{image_id}", status_code=204, response_model=None)
def remove_image(
    image_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin),
) -> None:
    record = db.get(SiteImage, image_id)
    if record is None:
        raise HTTPException(status_code=404, detail="That image no longer exists.")

    file_path, thumb_path = record.file_path, record.thumb_path
    db.delete(record)
    db.commit()
    delete_media(file_path, thumb_path)
