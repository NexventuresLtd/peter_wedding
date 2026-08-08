from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class AdminRole(str, enum.Enum):
    """Role hierarchy. superadmin > admin > moderator."""

    superadmin = "superadmin"  # everything, incl. managing admin users
    admin = "admin"  # moderation + site settings + agenda + images
    moderator = "moderator"  # moderation queue only


class UploadKind(str, enum.Enum):
    photo = "photo"
    video = "video"
    text = "text"


class UploadStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class AgendaSection(str, enum.Enum):
    ceremony = "ceremony"
    reception = "reception"
    afterparty = "afterparty"


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(150))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[AdminRole] = mapped_column(
        Enum(AdminRole, name="admin_role"), default=AdminRole.moderator
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    reviewed_uploads: Mapped[list[Upload]] = relationship(back_populates="reviewer")


class Upload(Base):
    """A guest contribution: a photo, a video, or a written message."""

    __tablename__ = "uploads"

    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[UploadKind] = mapped_column(Enum(UploadKind, name="upload_kind"))
    status: Mapped[UploadStatus] = mapped_column(
        Enum(UploadStatus, name="upload_status"),
        default=UploadStatus.pending,
        index=True,
    )

    # Media (null for text-only contributions)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    thumb_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Content
    message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Uploader details. Phone is mandatory for text, optional for media —
    # enforced at the API layer so admins can always trace a written message.
    uploader_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)

    # Trace metadata for abuse handling
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(400), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reviewed_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True
    )
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    reviewer: Mapped[AdminUser | None] = relationship(back_populates="reviewed_uploads")


class SiteSetting(Base):
    """Key/value store for theme + copy. One row per key, JSON value."""

    __tablename__ = "site_settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[dict | list | str | int | None] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class SiteImage(Base):
    """Curated wedding imagery managed by admins (hero, couple, gallery)."""

    __tablename__ = "site_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    slot: Mapped[str] = mapped_column(String(50), index=True)  # hero | couple | gallery
    file_path: Mapped[str] = mapped_column(String(500))
    thumb_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    caption_en: Mapped[str | None] = mapped_column(String(300), nullable=True)
    caption_rw: Mapped[str | None] = mapped_column(String(300), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class AgendaItem(Base):
    """One time-slot of the programme, stored bilingually."""

    __tablename__ = "agenda_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    section: Mapped[AgendaSection] = mapped_column(
        Enum(AgendaSection, name="agenda_section"), index=True
    )
    time_label: Mapped[str] = mapped_column(String(80))
    # Single-line slots (the church programme) use `summary_*` and no bullets.
    summary_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary_rw: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Bulleted slots (the reception) use these arrays. Nested bullets are
    # expressed as {"text": "...", "children": ["...", "..."]}.
    bullets_en: Mapped[list] = mapped_column(JSON, default=list)
    bullets_rw: Mapped[list] = mapped_column(JSON, default=list)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
