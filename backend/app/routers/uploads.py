"""Guest upload intake — open to the public, everything lands as `pending`."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Upload, UploadKind, UploadStatus
from ..schemas import TextUploadCreate, UploadPublic
from ..serializers import upload_public
from ..site_config import get_content
from ..storage import delete_media, save_media

router = APIRouter(prefix="/uploads", tags=["uploads"])

_CLOSED = HTTPException(
    status_code=423,
    detail="Uploads are closed for now. Thank you for celebrating with us!",
)


def _guard_open(db: Session) -> None:
    if not get_content(db).get("flags", {}).get("uploadsOpen", True):
        raise _CLOSED


def _trace(request: Request) -> dict:
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else (
        request.client.host if request.client else None
    )
    return {"ip_address": ip, "user_agent": request.headers.get("user-agent", "")[:400]}


@router.post("/media", response_model=UploadPublic, status_code=201)
def upload_media(
    request: Request,
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
    phone_number: str | None = Form(default=None),
    uploader_name: str | None = Form(default=None),
    message: str | None = Form(default=None),
) -> UploadPublic:
    """Accept a photo or video. Phone number is optional for media.

    The file is written to disk first; if the database insert then fails the
    orphaned file is removed so the upload directory cannot drift.
    """
    _guard_open(db)

    cleaned_phone = None
    if phone_number and phone_number.strip():
        # Reuse the text schema's validator so both paths normalise identically.
        cleaned_phone = TextUploadCreate.model_validate(
            {"message": "n/a", "phone_number": phone_number}
        ).phone_number

    stored = save_media(file, bucket="guest")

    record = Upload(
        kind=UploadKind(stored["kind"]),
        status=UploadStatus.pending,
        file_path=stored["file_path"],
        thumb_path=stored["thumb_path"],
        mime_type=stored["mime_type"],
        size_bytes=stored["size_bytes"],
        width=stored["width"],
        height=stored["height"],
        message=(message or "").strip()[:2000] or None,
        uploader_name=(uploader_name or "").strip()[:150] or None,
        phone_number=cleaned_phone,
        **_trace(request),
    )

    try:
        db.add(record)
        db.commit()
        db.refresh(record)
    except Exception:
        db.rollback()
        delete_media(stored["file_path"], stored["thumb_path"])
        raise

    return upload_public(record)


@router.post("/text", response_model=UploadPublic, status_code=201)
def upload_text(
    request: Request,
    payload: TextUploadCreate,
    db: Session = Depends(get_db),
) -> UploadPublic:
    """Accept a written message. Phone number is required (enforced in schema)."""
    _guard_open(db)

    record = Upload(
        kind=UploadKind.text,
        status=UploadStatus.pending,
        message=payload.message.strip(),
        uploader_name=payload.uploader_name,
        phone_number=payload.phone_number,
        **_trace(request),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return upload_public(record)


@router.get("/status")
def upload_status(db: Session = Depends(get_db)) -> dict:
    content = get_content(db)
    return {
        "open": bool(content.get("flags", {}).get("uploadsOpen", True)),
        "galleryPublic": bool(content.get("flags", {}).get("galleryPublic", True)),
    }
