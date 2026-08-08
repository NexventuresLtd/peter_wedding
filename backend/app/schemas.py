from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from .models import AdminRole, AgendaSection, UploadKind, UploadStatus

PHONE_RE = re.compile(r"^\+?[0-9\s\-()]{7,20}$")


def _clean_phone(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    if not PHONE_RE.match(value):
        raise ValueError(
            "Enter a valid phone number, e.g. 0788123456 or +250788123456."
        )
    return re.sub(r"[\s\-()]", "", value)


# --------------------------------------------------------------------------- auth


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    role: AdminRole
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None = None


class AdminUserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=150)
    password: str = Field(min_length=8, max_length=72)
    role: AdminRole = AdminRole.moderator


class AdminUserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    password: str | None = Field(default=None, min_length=8, max_length=72)
    role: AdminRole | None = None
    is_active: bool | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=72)


# ------------------------------------------------------------------------ uploads


class UploadPublic(BaseModel):
    """What the public gallery is allowed to see — never the phone number."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: UploadKind
    message: str | None
    uploader_name: str | None
    file_url: str | None = None
    thumb_url: str | None = None
    width: int | None = None
    height: int | None = None
    created_at: datetime


class UploadAdmin(UploadPublic):
    """Full record for the admin console, including uploader contact."""

    model_config = ConfigDict(from_attributes=True)

    status: UploadStatus
    phone_number: str | None
    mime_type: str | None
    size_bytes: int | None
    ip_address: str | None
    reviewed_at: datetime | None
    review_note: str | None
    reviewed_by: str | None = None


class UploadReview(BaseModel):
    status: UploadStatus
    review_note: str | None = Field(default=None, max_length=1000)

    @field_validator("status")
    @classmethod
    def not_back_to_pending(cls, v: UploadStatus) -> UploadStatus:
        if v is UploadStatus.pending:
            return v
        return v


class TextUploadCreate(BaseModel):
    """Written wishes. Phone number is mandatory here."""

    message: str = Field(min_length=2, max_length=2000)
    phone_number: str
    uploader_name: str | None = Field(default=None, max_length=150)

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = _clean_phone(v)
        if not cleaned:
            raise ValueError("A phone number is required for written messages.")
        return cleaned

    @field_validator("uploader_name")
    @classmethod
    def strip_name(cls, v: str | None) -> str | None:
        return v.strip() or None if v else None


class PaginatedUploads(BaseModel):
    items: list[UploadPublic]
    total: int
    page: int
    per_page: int
    has_more: bool


class PaginatedAdminUploads(BaseModel):
    items: list[UploadAdmin]
    total: int
    page: int
    per_page: int
    has_more: bool


class UploadStats(BaseModel):
    pending: int
    approved: int
    rejected: int
    photos: int
    videos: int
    texts: int
    total: int
    storage_used_bytes: int
    storage_free_bytes: int


# ------------------------------------------------------------------------- agenda


class AgendaItemBase(BaseModel):
    section: AgendaSection
    time_label: str = Field(min_length=1, max_length=80)
    summary_en: str | None = None
    summary_rw: str | None = None
    bullets_en: list[Any] = Field(default_factory=list)
    bullets_rw: list[Any] = Field(default_factory=list)
    sort_order: int = 0
    is_active: bool = True


class AgendaItemCreate(AgendaItemBase):
    pass


class AgendaItemUpdate(BaseModel):
    section: AgendaSection | None = None
    time_label: str | None = Field(default=None, min_length=1, max_length=80)
    summary_en: str | None = None
    summary_rw: str | None = None
    bullets_en: list[Any] | None = None
    bullets_rw: list[Any] | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class AgendaItemOut(AgendaItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# ------------------------------------------------------------------------ settings


class SiteImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slot: str
    file_url: str
    thumb_url: str | None = None
    caption_en: str | None
    caption_rw: str | None
    sort_order: int
    is_active: bool


class SiteImageUpdate(BaseModel):
    caption_en: str | None = None
    caption_rw: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class SiteConfig(BaseModel):
    """Everything the public site needs to render itself."""

    theme: dict[str, Any]
    content: dict[str, Any]
    images: dict[str, list[SiteImageOut]]


class SettingsUpdate(BaseModel):
    theme: dict[str, Any] | None = None
    content: dict[str, Any] | None = None
