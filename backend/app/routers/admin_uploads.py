"""Moderation queue — approve, reject and delete guest contributions."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import require_admin, require_moderator
from ..models import AdminUser, Upload, UploadKind, UploadStatus
from ..schemas import (
    PaginatedAdminUploads,
    UploadAdmin,
    UploadReview,
    UploadStats,
)
from ..serializers import upload_admin
from ..storage import delete_media, disk_usage_bytes, free_space_bytes

router = APIRouter(prefix="/api/admin/uploads", tags=["admin:uploads"])


@router.get("", response_model=PaginatedAdminUploads)
def list_uploads(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_moderator),
    status: UploadStatus | None = Query(default=None),
    kind: UploadKind | None = Query(default=None),
    search: str | None = Query(default=None, description="Match name, phone or message"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=30, ge=1, le=100),
) -> PaginatedAdminUploads:
    query = db.query(Upload).options(joinedload(Upload.reviewer))

    if status is not None:
        query = query.filter(Upload.status == status)
    if kind is not None:
        query = query.filter(Upload.kind == kind)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            Upload.uploader_name.ilike(term)
            | Upload.phone_number.ilike(term)
            | Upload.message.ilike(term)
        )

    total = query.count()
    items = (
        query.order_by(Upload.created_at.desc(), Upload.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return PaginatedAdminUploads(
        items=[upload_admin(item) for item in items],
        total=total,
        page=page,
        per_page=per_page,
        has_more=page * per_page < total,
    )


@router.get("/stats", response_model=UploadStats)
def upload_stats(
    db: Session = Depends(get_db), _: AdminUser = Depends(require_moderator)
) -> UploadStats:
    by_status = dict(
        db.query(Upload.status, func.count(Upload.id)).group_by(Upload.status).all()
    )
    by_kind = dict(
        db.query(Upload.kind, func.count(Upload.id)).group_by(Upload.kind).all()
    )

    return UploadStats(
        pending=by_status.get(UploadStatus.pending, 0),
        approved=by_status.get(UploadStatus.approved, 0),
        rejected=by_status.get(UploadStatus.rejected, 0),
        photos=by_kind.get(UploadKind.photo, 0),
        videos=by_kind.get(UploadKind.video, 0),
        texts=by_kind.get(UploadKind.text, 0),
        total=sum(by_status.values()),
        storage_used_bytes=disk_usage_bytes(),
        storage_free_bytes=free_space_bytes(),
    )


def _get_or_404(db: Session, upload_id: int) -> Upload:
    upload = db.get(Upload, upload_id)
    if upload is None:
        raise HTTPException(status_code=404, detail="That upload no longer exists.")
    return upload


@router.patch("/{upload_id}", response_model=UploadAdmin)
def review_upload(
    upload_id: int,
    payload: UploadReview,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(require_moderator),
) -> UploadAdmin:
    """Approve or reject a single item. Approving publishes it to the gallery."""
    upload = _get_or_404(db, upload_id)

    upload.status = payload.status
    upload.review_note = payload.review_note
    upload.reviewed_at = datetime.now(UTC)
    upload.reviewed_by_id = admin.id
    db.commit()
    db.refresh(upload)

    return upload_admin(upload)


@router.post("/bulk", response_model=dict)
def bulk_review(
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(require_moderator),
    ids: list[int] = Body(..., embed=True),
    status: UploadStatus = Body(..., embed=True),
) -> dict:
    """Approve or reject many items at once — the common case after an event."""
    if not ids:
        return {"updated": 0}

    updated = (
        db.query(Upload)
        .filter(Upload.id.in_(ids))
        .update(
            {
                Upload.status: status,
                Upload.reviewed_at: datetime.now(UTC),
                Upload.reviewed_by_id: admin.id,
            },
            synchronize_session=False,
        )
    )
    db.commit()
    return {"updated": updated, "status": status.value}


@router.delete("/{upload_id}", status_code=204, response_model=None)
def delete_upload(
    upload_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin),
) -> None:
    """Permanently remove an upload and its files. Admin-and-above only."""
    upload = _get_or_404(db, upload_id)
    file_path, thumb_path = upload.file_path, upload.thumb_path

    db.delete(upload)
    db.commit()
    delete_media(file_path, thumb_path)
