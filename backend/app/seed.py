"""Create tables and seed the first admin, the theme and the agenda.

Idempotent — safe to run repeatedly. Run with:

    python -m app.seed
"""

from __future__ import annotations

import re
import sys

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from .config import settings
from .database import Base, SessionLocal, engine
from .defaults import DEFAULT_AGENDA, DEFAULT_CONTENT, DEFAULT_THEME
from .models import AdminRole, AdminUser, AgendaItem, AgendaSection, SiteSetting
from .security import hash_password
from .storage import ensure_upload_dirs

# Postgres identifiers we are willing to create. Deliberately strict: the name
# is interpolated into a CREATE DATABASE statement, which cannot be
# parameterised.
SAFE_DB_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_$]{0,62}$")


def ensure_database_exists() -> None:
    """Create the target database if it is not there yet.

    CREATE DATABASE cannot run inside a transaction and cannot be issued from
    a connection to the database being created, so this connects to the
    'postgres' maintenance database in autocommit mode instead.
    """
    url = make_url(settings.database_url)
    name = url.database

    if not name:
        raise ValueError("DATABASE_URL has no database name.")
    if not SAFE_DB_NAME.match(name):
        raise ValueError(
            f"Refusing to create a database named {name!r} — use letters, "
            "digits and underscores only."
        )

    admin_engine = create_engine(
        url.set(database="postgres"), isolation_level="AUTOCOMMIT", pool_pre_ping=True
    )
    try:
        with admin_engine.connect() as connection:
            exists = connection.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": name}
            ).scalar()

            if exists:
                print(f"• Database '{name}' already exists")
                return

            connection.execute(text(f'CREATE DATABASE "{name}"'))
            print(f"✓ Created database '{name}'")
    finally:
        admin_engine.dispose()


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
        ensure_database_exists()
        create_tables()
    except Exception as exc:  # noqa: BLE001
        print(f"✗ Could not set up the database: {exc}")
        print("  Check DATABASE_URL in backend/.env — the host, port and")
        print("  credentials must be right, and the role needs CREATEDB rights")
        print("  the first time so the database can be created for you.")
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
