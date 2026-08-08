"""Local-disk media storage.

Files land under `UPLOAD_DIR/<bucket>/<yyyy>/<mm>/<uuid><ext>` and are served
back through the `/media` static mount. Only the relative path is stored in
the database so the upload directory can be moved or re-mounted freely.
"""

from __future__ import annotations

import secrets
import shutil
from datetime import UTC, datetime
from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from .config import settings

IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "image/gif": ".gif",
}

VIDEO_TYPES = {
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
    "video/x-matroska": ".mkv",
    "video/3gpp": ".3gp",
}

THUMB_MAX = (900, 900)


def _target_dir(bucket: str) -> Path:
    now = datetime.now(UTC)
    path = settings.upload_path / bucket / f"{now:%Y}" / f"{now:%m}"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _relative(path: Path) -> str:
    return path.relative_to(settings.upload_path).as_posix()


def classify(upload: UploadFile) -> str:
    """Return 'photo' or 'video', or raise if the type is not allowed."""
    content_type = (upload.content_type or "").lower()
    if content_type in IMAGE_TYPES:
        return "photo"
    if content_type in VIDEO_TYPES:
        return "video"
    raise HTTPException(
        status_code=415,
        detail=(
            "Unsupported file type. Please upload a photo (JPG, PNG, WEBP, HEIC) "
            "or a video (MP4, MOV, WEBM)."
        ),
    )


def save_media(upload: UploadFile, bucket: str = "guest") -> dict:
    """Persist an uploaded file, enforcing size limits while streaming.

    Returns a dict with file_path, thumb_path, mime_type, size_bytes, width,
    height and kind.
    """
    kind = classify(upload)
    content_type = (upload.content_type or "").lower()
    extension = (IMAGE_TYPES if kind == "photo" else VIDEO_TYPES)[content_type]
    limit_mb = settings.max_image_mb if kind == "photo" else settings.max_video_mb
    limit_bytes = limit_mb * 1024 * 1024

    destination = _target_dir(bucket) / f"{secrets.token_urlsafe(16)}{extension}"

    size = 0
    try:
        with destination.open("wb") as out:
            while chunk := upload.file.read(1024 * 1024):
                size += len(chunk)
                if size > limit_bytes:
                    out.close()
                    destination.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File is too large. The limit for a {kind} is {limit_mb} MB.",
                    )
                out.write(chunk)
    finally:
        upload.file.close()

    if size == 0:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    result = {
        "kind": kind,
        "file_path": _relative(destination),
        "thumb_path": None,
        "mime_type": content_type,
        "size_bytes": size,
        "width": None,
        "height": None,
    }

    if kind == "photo":
        result.update(_derive_image_metadata(destination))

    return result


def _derive_image_metadata(source: Path) -> dict:
    """Read dimensions and write a web-sized thumbnail beside the original.

    HEIC and other formats Pillow cannot open are stored as-is; the gallery
    falls back to the full file when no thumbnail exists.
    """
    try:
        with Image.open(source) as img:
            img = _apply_exif_rotation(img)
            width, height = img.size

            thumb = img.copy()
            thumb.thumbnail(THUMB_MAX, Image.LANCZOS)
            if thumb.mode in ("RGBA", "P", "LA"):
                thumb = thumb.convert("RGB")
            thumb_path = source.with_name(f"{source.stem}_thumb.jpg")
            thumb.save(thumb_path, "JPEG", quality=82, optimize=True)
    except (UnidentifiedImageError, OSError, ValueError):
        return {}

    return {"width": width, "height": height, "thumb_path": _relative(thumb_path)}


def _apply_exif_rotation(img: Image.Image) -> Image.Image:
    """Honour the EXIF orientation tag so phone photos are not sideways."""
    try:
        exif = img.getexif()
        orientation = exif.get(274)
    except (AttributeError, KeyError, TypeError):
        return img

    rotations = {3: Image.ROTATE_180, 6: Image.ROTATE_270, 8: Image.ROTATE_90}
    if orientation in rotations:
        return img.transpose(rotations[orientation])
    return img


def delete_media(*relative_paths: str | None) -> None:
    """Remove files from disk, ignoring anything already gone.

    Paths are resolved and checked to stay inside the upload directory so a
    tampered database value cannot reach the wider filesystem.
    """
    root = settings.upload_path.resolve()
    for relative_path in relative_paths:
        if not relative_path:
            continue
        candidate = (settings.upload_path / relative_path).resolve()
        if candidate.is_relative_to(root) and candidate.is_file():
            candidate.unlink(missing_ok=True)


def ensure_upload_dirs() -> None:
    for bucket in ("guest", "site"):
        (settings.upload_path / bucket).mkdir(parents=True, exist_ok=True)


def disk_usage_bytes() -> int:
    if not settings.upload_path.exists():
        return 0
    return sum(f.stat().st_size for f in settings.upload_path.rglob("*") if f.is_file())


def free_space_bytes() -> int:
    return shutil.disk_usage(settings.upload_path).free
