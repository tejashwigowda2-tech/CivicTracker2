from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from ..auth import require_officer
from ..database import get_db
from ..models import (
    AuditLog,
    Complaint,
    ComplaintImage,
    Notification,
    Officer,
    StatusHistory,
    User,
)
from ..schemas import OfficerStartWorkRequest, PublicComplaintSerializer
from ..services.recognition import calculate_officer_performance
from ..services.storage import store_image_bytes, validate_and_read_image

router = APIRouter(tags=["Officer Portal"])


def _get_officer_scope_query(db: Session, user: User):
    query = db.query(Complaint)
    if user.role == "officer":
        officer: Officer = user.officer_profile
        query = query.filter(Complaint.department_id == officer.department_id)
        if officer.assigned_area_id:
            query = query.filter(
                (Complaint.assigned_officer_id == officer.officer_id)
                | (Complaint.area_id == officer.assigned_area_id)
            )
        else:
            query = query.filter(Complaint.assigned_officer_id == officer.officer_id)
    return query


def _authorize_officer_complaint(db: Session, user: User, complaint_id: str) -> Complaint:
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")
    if user.role == "officer":
        officer: Officer = user.officer_profile
        if complaint.department_id != officer.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: complaint belongs to a different department.",
            )
        if officer.assigned_area_id and complaint.area_id and complaint.area_id != officer.assigned_area_id:
            if complaint.assigned_officer_id != officer.officer_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: complaint is outside your assigned pilot area.",
                )
    return complaint


@router.get("/api/officers/dashboard")
def officer_dashboard(
    current_user: User = Depends(require_officer),
    db: Session = Depends(get_db),
):
    complaints = _get_officer_scope_query(db, current_user).all()

    total_assigned = len(complaints)
    pending = sum(1 for c in complaints if c.status in ("ASSIGNED", "UNDER_REVIEW", "SUBMITTED", "REOPENED"))
    in_progress = sum(1 for c in complaints if c.status == "IN_PROGRESS")
    awaiting_verification = sum(1 for c in complaints if c.status == "AWAITING_VERIFICATION")
    overdue = sum(1 for c in complaints if c.status == "OVERDUE")
    verified_resolutions = sum(1 for c in complaints if c.status == "RESOLVED_VERIFIED")
    disputed = sum(1 for c in complaints if c.status == "DISPUTED")

    priority_dist = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    area_counts: dict[str, int] = {}
    for c in complaints:
        priority_dist[c.priority_level] = priority_dist.get(c.priority_level, 0) + 1
        aname = c.area.area_name if c.area else "Unassigned Area"
        area_counts[aname] = area_counts.get(aname, 0) + 1

    return {
        "officer": {
            "full_name": current_user.full_name,
            "employee_id": current_user.officer_profile.employee_id if current_user.officer_profile else "ADMIN",
            "department_name": (
                current_user.officer_profile.department.department_name
                if current_user.officer_profile and current_user.officer_profile.department
                else "All Departments"
            ),
            "assigned_area_name": (
                current_user.officer_profile.assigned_area.area_name
                if current_user.officer_profile and current_user.officer_profile.assigned_area
                else "All Areas"
            ),
            "designation": current_user.officer_profile.designation if current_user.officer_profile else "Supervisor",
        },
        "stats": {
            "total_assigned": total_assigned,
            "pending": pending,
            "in_progress": in_progress,
            "awaiting_verification": awaiting_verification,
            "overdue": overdue,
            "verified_resolutions": verified_resolutions,
            "disputed": disputed,
        },
        "priority_distribution": [
            {"name": k, "value": v} for k, v in priority_dist.items()
        ],
        "area_statistics": [
            {"area": k, "count": v} for k, v in area_counts.items()
        ],
        "is_demo_data": True,
    }


@router.get("/api/officers/complaints")
def officer_complaints_list(
    category: Optional[str] = Query(default=None),
    area_id: Optional[str] = Query(default=None),
    priority_level: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    current_user: User = Depends(require_officer),
    db: Session = Depends(get_db),
):
    query = _get_officer_scope_query(db, current_user)
    if category:
        query = query.filter(Complaint.category == category)
    if area_id:
        query = query.filter(Complaint.area_id == area_id)
    if priority_level:
        query = query.filter(Complaint.priority_level == priority_level)
    if status_filter:
        query = query.filter(Complaint.status == status_filter)

    rows = query.order_by(Complaint.priority_score.desc(), Complaint.created_at.desc()).all()
    items = []
    for c in rows:
        item = PublicComplaintSerializer.to_summary(c, current_user)
        # Officers are authorized to view internal remarks for their assigned queue
        item["internal_remarks"] = c.internal_remarks
        item["assigned_officer_id"] = c.assigned_officer_id
        items.append(item)
    return {"total": len(items), "items": items}


@router.patch("/api/officers/complaints/{complaint_id}/start")
def officer_start_work(
    complaint_id: str,
    payload: OfficerStartWorkRequest = OfficerStartWorkRequest(),
    current_user: User = Depends(require_officer),
    db: Session = Depends(get_db),
):
    complaint = _authorize_officer_complaint(db, current_user, complaint_id)
    if complaint.status not in ("ASSIGNED", "OVERDUE", "REOPENED", "DISPUTED", "UNDER_REVIEW"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot start work when complaint status is '{complaint.status}'.",
        )

    old_status = complaint.status
    complaint.status = "IN_PROGRESS"
    if current_user.officer_profile and not complaint.assigned_officer_id:
        complaint.assigned_officer_id = current_user.officer_profile.officer_id
    if payload.internal_remarks:
        existing = complaint.internal_remarks or ""
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        complaint.internal_remarks = f"{existing}\n[{stamp} - {current_user.full_name}]: {payload.internal_remarks}".strip()

    public_remark = payload.remarks or "Department officer started repair work on site."
    db.add(
        StatusHistory(
            complaint_id=complaint.complaint_id,
            old_status=old_status,
            new_status="IN_PROGRESS",
            changed_by=current_user.user_id,
            remarks=public_remark,
        )
    )
    db.add(
        AuditLog(
            actor_id=current_user.user_id,
            action="OFFICER_STARTED_WORK",
            entity_type="complaint",
            entity_id=complaint.complaint_id,
            details=public_remark,
        )
    )
    if complaint.reporter_id:
        db.add(
            Notification(
                user_id=complaint.reporter_id,
                complaint_id=complaint.complaint_id,
                title=f"Work Started: {complaint.reference_code}",
                message=f"An assigned officer has started work on {complaint.reference_code}.",
            )
        )

    db.commit()
    db.refresh(complaint)
    res = PublicComplaintSerializer.to_summary(complaint, current_user)
    res["internal_remarks"] = complaint.internal_remarks
    return res


@router.post("/api/officers/complaints/{complaint_id}/complete")
def officer_complete_work(
    complaint_id: str,
    after_image: UploadFile = File(...),
    remarks: str = Form(default="Repair completed; after-work photograph uploaded for citizen verification."),
    internal_remarks: Optional[str] = Form(default=None),
    current_user: User = Depends(require_officer),
    db: Session = Depends(get_db),
):
    complaint = _authorize_officer_complaint(db, current_user, complaint_id)
    if complaint.status not in ("IN_PROGRESS", "ASSIGNED", "OVERDUE", "REOPENED", "DISPUTED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit repair completion when complaint status is '{complaint.status}'.",
        )

    raw_bytes, ext = validate_and_read_image(after_image)
    after_url = store_image_bytes(raw_bytes, ext, prefix="after")

    db.add(
        ComplaintImage(
            complaint_id=complaint.complaint_id,
            image_url=after_url,
            image_type="AFTER",
            uploaded_by=current_user.user_id,
        )
    )

    now = datetime.now(timezone.utc)
    old_status = complaint.status
    complaint.status = "AWAITING_VERIFICATION"
    complaint.completion_requested_at = now
    if current_user.officer_profile and not complaint.assigned_officer_id:
        complaint.assigned_officer_id = current_user.officer_profile.officer_id
    if internal_remarks:
        existing = complaint.internal_remarks or ""
        stamp = now.strftime("%Y-%m-%d %H:%M UTC")
        complaint.internal_remarks = f"{existing}\n[{stamp} - {current_user.full_name}]: {internal_remarks}".strip()

    db.add(
        StatusHistory(
            complaint_id=complaint.complaint_id,
            old_status=old_status,
            new_status="AWAITING_VERIFICATION",
            changed_by=current_user.user_id,
            remarks=f"Repair evidence uploaded. {remarks}",
            changed_at=now,
        )
    )
    db.add(
        AuditLog(
            actor_id=current_user.user_id,
            action="OFFICER_SUBMITTED_COMPLETION_EVIDENCE",
            entity_type="complaint",
            entity_id=complaint.complaint_id,
            details=remarks,
        )
    )

    # Notify reporter and all eligible supporters to verify the repair
    notified_users = set()
    if complaint.reporter_id:
        notified_users.add(complaint.reporter_id)
    for sup in complaint.supports:
        notified_users.add(sup.user_id)

    for uid in notified_users:
        db.add(
            Notification(
                user_id=uid,
                complaint_id=complaint.complaint_id,
                title=f"Verification Requested: {complaint.reference_code}",
                message="Repair evidence has been uploaded. Please compare before-and-after photos and verify if the issue is resolved.",
            )
        )

    db.commit()
    db.refresh(complaint)
    res = PublicComplaintSerializer.to_summary(complaint, current_user)
    res["internal_remarks"] = complaint.internal_remarks
    return res


@router.post("/api/officers/complaints/{complaint_id}/reopen")
def officer_reopen_disputed_complaint(
    complaint_id: str,
    payload: OfficerStartWorkRequest = OfficerStartWorkRequest(),
    current_user: User = Depends(require_officer),
    db: Session = Depends(get_db),
):
    complaint = _authorize_officer_complaint(db, current_user, complaint_id)
    if complaint.status != "DISPUTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only DISPUTED complaints can be reopened through this action.",
        )

    old_status = complaint.status
    complaint.status = "REOPENED"
    remark = payload.remarks or "Complaint reopened following citizen verification dispute."
    db.add(
        StatusHistory(
            complaint_id=complaint.complaint_id,
            old_status=old_status,
            new_status="REOPENED",
            changed_by=current_user.user_id,
            remarks=remark,
        )
    )
    db.add(
        AuditLog(
            actor_id=current_user.user_id,
            action="COMPLAINT_REOPENED",
            entity_type="complaint",
            entity_id=complaint.complaint_id,
            details=remark,
        )
    )
    if complaint.reporter_id:
        db.add(
            Notification(
                user_id=complaint.reporter_id,
                complaint_id=complaint.complaint_id,
                title=f"Complaint Reopened: {complaint.reference_code}",
                message=remark,
            )
        )

    db.commit()
    db.refresh(complaint)
    res = PublicComplaintSerializer.to_summary(complaint, current_user)
    res["internal_remarks"] = complaint.internal_remarks
    return res


@router.get("/api/officers/performance")
def officer_performance(
    current_user: User = Depends(require_officer),
    db: Session = Depends(get_db),
):
    if current_user.role == "officer" and current_user.officer_profile:
        return calculate_officer_performance(db, current_user.officer_profile)

    # Admin viewing all officers' performance summary
    officers = db.query(Officer).all()
    return {
        "officers": [calculate_officer_performance(db, off) for off in officers],
        "is_demo_data": True,
    }
