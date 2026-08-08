"""Create tables and seed the first admin, the theme and the agenda.

Idempotent — safe to run repeatedly. Run with:

    python -m app.seed
"""

from __future__ import annotations

import sys

from sqlalchemy.orm import Session

from .config import settings
from .database import Base, SessionLocal, engine
from .defaults import DEFAULT_AGENDA, DEFAULT_CONTENT, DEFAULT_THEME
from .models import AdminRole, AdminUser, AgendaItem, AgendaSection, SiteSetting
from .security import hash_password
from .storage import ensure_upload_dirs


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)
    print("✓ Tables ready")


def seed_admin(db: Session) -> None:
    email = settings.first_admin_email.lower()
    if db.query(AdminUser).filter(AdminUser.email == email).first():
        print(f"• Admin {email} already exists — left untouched")
        return

    db.add(
        AdminUser(
            email=email,
            full_name=settings.first_admin_name,
            hashed_password=hash_password(settings.first_admin_password),
            role=AdminRole.superadmin,
        )
    )
    db.commit()
    print(f"✓ Superadmin created: {email}")
    if settings.first_admin_password == "ChangeMe123!":
        print("  ⚠ Still using the default password — change it after first login.")


def seed_settings(db: Session) -> None:
    for key, value in (("theme", DEFAULT_THEME), ("content", DEFAULT_CONTENT)):
        if db.get(SiteSetting, key) is None:
            db.add(SiteSetting(key=key, value=value))
            print(f"✓ Seeded '{key}' settings")
        else:
            print(f"• '{key}' settings already present — left untouched")
    db.commit()


def seed_agenda(db: Session) -> None:
    if db.query(AgendaItem).count() > 0:
        print("• Agenda already populated — left untouched")
        return

    for entry in DEFAULT_AGENDA:
        db.add(
            AgendaItem(
                section=AgendaSection(entry["section"]),
                time_label=entry["time_label"],
                summary_en=entry.get("summary_en"),
                summary_rw=entry.get("summary_rw"),
                bullets_en=entry.get("bullets_en", []),
                bullets_rw=entry.get("bullets_rw", []),
                sort_order=entry["sort_order"],
            )
        )
    db.commit()
    print(f"✓ Seeded {len(DEFAULT_AGENDA)} agenda items (EN + RW)")


def main() -> int:
    print(f"Database: {settings.database_url.split('@')[-1]}")
    try:
        create_tables()
    except Exception as exc:  # noqa: BLE001
        print(f"✗ Could not reach the database: {exc}")
        print("  Check DATABASE_URL in backend/.env and that the 'peterwedding' "
              "database exists.")
        return 1

    ensure_upload_dirs()
    with SessionLocal() as db:
        seed_admin(db)
        seed_settings(db)
        seed_agenda(db)

    print("\nDone. Start the API with: uvicorn app.main:app --reload")
    return 0


if __name__ == "__main__":
    sys.exit(main())
