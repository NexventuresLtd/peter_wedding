"""Admin account management. Superadmin only."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_superadmin
from ..models import AdminRole, AdminUser
from ..schemas import AdminUserCreate, AdminUserOut, AdminUserUpdate
from ..security import hash_password

router = APIRouter(prefix="/admin/users", tags=["admin:users"])


@router.get("", response_model=list[AdminUserOut])
def list_users(
    db: Session = Depends(get_db), _: AdminUser = Depends(require_superadmin)
) -> list[AdminUser]:
    return db.query(AdminUser).order_by(AdminUser.created_at).all()


@router.post("", response_model=AdminUserOut, status_code=201)
def create_user(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_superadmin),
) -> AdminUser:
    email = payload.email.lower()
    if db.query(AdminUser).filter(AdminUser.email == email).first():
        raise HTTPException(status_code=409, detail="That email is already registered.")

    user = AdminUser(
        email=email,
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _get_or_404(db: Session, user_id: int) -> AdminUser:
    user = db.get(AdminUser, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="That account no longer exists.")
    return user


def _guard_last_superadmin(db: Session, target: AdminUser) -> None:
    """Refuse changes that would leave nobody able to manage accounts."""
    if target.role is not AdminRole.superadmin:
        return
    remaining = (
        db.query(AdminUser)
        .filter(
            AdminUser.role == AdminRole.superadmin,
            AdminUser.is_active.is_(True),
            AdminUser.id != target.id,
        )
        .count()
    )
    if remaining == 0:
        raise HTTPException(
            status_code=409,
            detail="This is the last active superadmin — promote someone else first.",
        )


@router.patch("/{user_id}", response_model=AdminUserOut)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    actor: AdminUser = Depends(require_superadmin),
) -> AdminUser:
    user = _get_or_404(db, user_id)
    data = payload.model_dump(exclude_unset=True)

    demoting = "role" in data and data["role"] is not AdminRole.superadmin
    deactivating = data.get("is_active") is False
    if demoting or deactivating:
        _guard_last_superadmin(db, user)
    if deactivating and user.id == actor.id:
        raise HTTPException(status_code=409, detail="You cannot disable your own account.")

    if "password" in data and data["password"]:
        user.hashed_password = hash_password(data.pop("password"))
    data.pop("password", None)

    for field, value in data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204, response_model=None)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    actor: AdminUser = Depends(require_superadmin),
) -> None:
    user = _get_or_404(db, user_id)
    if user.id == actor.id:
        raise HTTPException(status_code=409, detail="You cannot delete your own account.")
    _guard_last_superadmin(db, user)

    db.delete(user)
    db.commit()
