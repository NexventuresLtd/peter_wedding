"""Reading and writing the site's theme/content settings."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from sqlalchemy.orm import Session

from .defaults import DEFAULT_CONTENT, DEFAULT_THEME
from .models import SiteImage, SiteSetting
from .schemas import SiteConfig
from .serializers import site_image

THEME_KEY = "theme"
CONTENT_KEY = "content"


def _deep_merge(base: dict, override: Any) -> dict:
    """Merge `override` onto a copy of `base`, recursing into nested dicts.

    Missing keys fall back to the defaults, so adding a new theme token in
    code does not require a database migration.
    """
    result = deepcopy(base)
    if not isinstance(override, dict):
        return result
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def _read(db: Session, key: str) -> Any:
    row = db.get(SiteSetting, key)
    return row.value if row else None


def _write(db: Session, key: str, value: Any) -> None:
    row = db.get(SiteSetting, key)
    if row is None:
        db.add(SiteSetting(key=key, value=value))
    else:
        row.value = value


def get_theme(db: Session) -> dict:
    return _deep_merge(DEFAULT_THEME, _read(db, THEME_KEY))


def get_content(db: Session) -> dict:
    return _deep_merge(DEFAULT_CONTENT, _read(db, CONTENT_KEY))


def save_theme(db: Session, patch: dict) -> dict:
    merged = _deep_merge(get_theme(db), patch)
    _write(db, THEME_KEY, merged)
    db.commit()
    return merged


def save_content(db: Session, patch: dict) -> dict:
    merged = _deep_merge(get_content(db), patch)
    _write(db, CONTENT_KEY, merged)
    db.commit()
    return merged


def reset_theme(db: Session) -> dict:
    _write(db, THEME_KEY, deepcopy(DEFAULT_THEME))
    db.commit()
    return deepcopy(DEFAULT_THEME)


def grouped_images(db: Session, *, only_active: bool = True) -> dict[str, list]:
    query = db.query(SiteImage)
    if only_active:
        query = query.filter(SiteImage.is_active.is_(True))
    images = query.order_by(SiteImage.slot, SiteImage.sort_order, SiteImage.id).all()

    grouped: dict[str, list] = {}
    for image in images:
        grouped.setdefault(image.slot, []).append(site_image(image))
    return grouped


def build_site_config(db: Session) -> SiteConfig:
    return SiteConfig(
        theme=get_theme(db),
        content=get_content(db),
        images=grouped_images(db),
    )
