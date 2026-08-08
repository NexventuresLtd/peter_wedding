"""Model -> schema conversion, centralising how media URLs are built."""

from __future__ import annotations

from .models import SiteImage, Upload
from .schemas import SiteImageOut, UploadAdmin, UploadPublic

MEDIA_PREFIX = "/media"


def media_url(relative_path: str | None) -> str | None:
    if not relative_path:
        return None
    return f"{MEDIA_PREFIX}/{relative_path.lstrip('/')}"


def upload_public(upload: Upload) -> UploadPublic:
    return UploadPublic(
        id=upload.id,
        kind=upload.kind,
        message=upload.message,
        uploader_name=upload.uploader_name,
        file_url=media_url(upload.file_path),
        # Fall back to the original when no thumbnail could be generated
        # (HEIC, or any format Pillow declined to open).
        thumb_url=media_url(upload.thumb_path) or media_url(upload.file_path),
        width=upload.width,
        height=upload.height,
        created_at=upload.created_at,
    )


def upload_admin(upload: Upload) -> UploadAdmin:
    return UploadAdmin(
        **upload_public(upload).model_dump(),
        status=upload.status,
        phone_number=upload.phone_number,
        mime_type=upload.mime_type,
        size_bytes=upload.size_bytes,
        ip_address=upload.ip_address,
        reviewed_at=upload.reviewed_at,
        review_note=upload.review_note,
        reviewed_by=upload.reviewer.full_name if upload.reviewer else None,
    )


def site_image(image: SiteImage) -> SiteImageOut:
    return SiteImageOut(
        id=image.id,
        slot=image.slot,
        file_url=media_url(image.file_path) or "",
        thumb_url=media_url(image.thumb_path) or media_url(image.file_path),
        caption_en=image.caption_en,
        caption_rw=image.caption_rw,
        sort_order=image.sort_order,
        is_active=image.is_active,
    )
