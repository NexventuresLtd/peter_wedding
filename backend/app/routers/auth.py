from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import current_admin
from ..models import AdminUser
from ..schemas import AdminUserOut, PasswordChange, Token
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

_BAD_LOGIN = HTTPException(status_code=401, detail="Incorrect email or password.")


@router.post("/login", response_model=Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
) -> Token:
    """OAuth2 password flow. The `username` field carries the admin's email."""
    email = form.username.strip().lower()
    user = db.query(AdminUser).filter(AdminUser.email == email).first()

    # Same error either way so the form cannot be used to enumerate accounts.
    if user is None or not verify_password(form.password, user.hashed_password):
        raise _BAD_LOGIN
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been disabled.")

    user.last_login_at = datetime.now(UTC)
    db.commit()

    return Token(access_token=create_access_token(user.email, user.role.value))


@router.get("/me", response_model=AdminUserOut)
def read_me(user: AdminUser = Depends(current_admin)) -> AdminUser:
    return user


@router.post("/change-password", status_code=204, response_model=None)
def change_password(
    payload: PasswordChange,
    user: AdminUser = Depends(current_admin),
    db: Session = Depends(get_db),
) -> None:
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Your current password is wrong.")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
