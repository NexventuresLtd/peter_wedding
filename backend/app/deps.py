from collections.abc import Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import AdminRole, AdminUser
from .security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

_CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)

# Higher number == more privilege.
_ROLE_RANK: dict[AdminRole, int] = {
    AdminRole.moderator: 1,
    AdminRole.admin: 2,
    AdminRole.superadmin: 3,
}


def current_admin(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> AdminUser:
    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError:
        raise _CREDENTIALS_ERROR from None

    email = payload.get("sub")
    if not email:
        raise _CREDENTIALS_ERROR

    user = db.query(AdminUser).filter(AdminUser.email == email).first()
    if user is None:
        raise _CREDENTIALS_ERROR
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been disabled.")
    return user


def require_role(minimum: AdminRole) -> Callable[..., AdminUser]:
    """Dependency factory gating an endpoint behind a minimum role."""

    def _guard(user: AdminUser = Depends(current_admin)) -> AdminUser:
        if _ROLE_RANK[user.role] < _ROLE_RANK[minimum]:
            raise HTTPException(
                status_code=403,
                detail=f"This action requires the '{minimum.value}' role or higher.",
            )
        return user

    return _guard


require_moderator = require_role(AdminRole.moderator)
require_admin = require_role(AdminRole.admin)
require_superadmin = require_role(AdminRole.superadmin)
