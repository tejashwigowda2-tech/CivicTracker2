from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import (
    create_access_token,
    get_current_user,
    hash_password,
    rate_limit_auth,
    verify_password,
)
from ..database import get_db
from ..models import AuditLog, Officer, User
from ..schemas import AuthResponse, CitizenRegisterRequest, LoginRequest, UserSummary

router = APIRouter(tags=["Authentication"])


def _build_user_summary(user: User) -> UserSummary:
    officer: Officer | None = user.officer_profile
    return UserSummary(
        user_id=user.user_id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        employee_id=officer.employee_id if officer else None,
        department_id=officer.department_id if officer else None,
        department_name=officer.department.department_name if officer and officer.department else None,
        assigned_area_id=officer.assigned_area_id if officer else None,
        assigned_area_name=officer.assigned_area.area_name if officer and officer.assigned_area else None,
        designation=officer.designation if officer else None,
    )


@router.post("/api/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_citizen(
    payload: CitizenRegisterRequest,
    _: None = Depends(rate_limit_auth),
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

    user = User(
        full_name=payload.full_name.strip(),
        email=payload.email.lower().strip(),
        phone=payload.phone.strip() if payload.phone else None,
        password_hash=hash_password(payload.password),
        role="citizen",
        is_active=True,
    )
    db.add(user)
    db.flush()
    db.add(
        AuditLog(
            actor_id=user.user_id,
            action="CITIZEN_REGISTERED",
            entity_type="user",
            entity_id=user.user_id,
            details="Citizen account registered.",
        )
    )
    db.commit()
    db.refresh(user)

    token = create_access_token(user.user_id, user.role)
    return AuthResponse(access_token=token, user=_build_user_summary(user))


@router.post("/api/auth/login", response_model=AuthResponse)
def login_user(
    payload: LoginRequest,
    _: None = Depends(rate_limit_auth),
    db: Session = Depends(get_db),
):
    if not payload.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is required.")

    user = db.query(User).filter(User.email == payload.email.lower().strip(), User.is_active == True).first()  # noqa: E712
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    token = create_access_token(user.user_id, user.role)
    return AuthResponse(access_token=token, user=_build_user_summary(user))


@router.post("/api/officers/login", response_model=AuthResponse)
def officer_or_admin_login(
    payload: LoginRequest,
    _: None = Depends(rate_limit_auth),
    db: Session = Depends(get_db),
):
    user: User | None = None
    if payload.employee_id:
        officer = db.query(Officer).filter(Officer.employee_id == payload.employee_id.strip()).first()
        if officer:
            user = officer.user
    elif payload.email:
        user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee ID or email is required.")

    if not user or not user.is_active or user.role not in ("officer", "admin"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid officer or administrator credentials.")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid officer or administrator credentials.")

    db.add(
        AuditLog(
            actor_id=user.user_id,
            action="STAFF_LOGIN",
            entity_type="user",
            entity_id=user.user_id,
            details=f"Role '{user.role}' authenticated.",
        )
    )
    db.commit()

    token = create_access_token(user.user_id, user.role)
    return AuthResponse(access_token=token, user=_build_user_summary(user))


@router.get("/api/auth/me", response_model=UserSummary)
def get_me(current_user: User = Depends(get_current_user)):
    return _build_user_summary(current_user)
