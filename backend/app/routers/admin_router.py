from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import hash_password, require_admin
from ..database import get_db
from ..models import (
    Area,
    AuditLog,
    Complaint,
    ComplaintCategory,
    Department,
    EscalationRecord,
    JurisdictionMapping,
    Notification,
    Officer,
    RecurrenceLink,
    StatusHistory,
    User,
)
from ..schemas import (
    AdminAssignRequest,
    AreaCreateRequest,
    CategoryCreateRequest,
    CategoryUpdateRequest,
    DepartmentCreateRequest,
    JurisdictionCreateRequest,
    OfficerCreateRequest,
    PublicComplaintSerializer,
    RecurrenceReviewRequest,
)
from ..services.escalation import run_escalation_sweep
from ..services.priority import recalculate_complaint_priority
from ..services.recognition import calculate_officer_performance

router = APIRouter(tags=["Administrator Portal"])


@router.get("/api/admin/complaints/pending-review")
def list_pending_review_complaints(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Complaint)
        .filter(Complaint.status.in_(["SUBMITTED", "UNDER_REVIEW", "DISPUTED", "OVERDUE"]))
        .order_by(Complaint.priority_score.desc(), Complaint.created_at.desc())
        .all()
    )
    items = []
    for c in rows:
        item = PublicComplaintSerializer.to_summary(c, current_user)
        item["assigned_officer_id"] = c.assigned_officer_id
        item["internal_remarks"] = c.internal_remarks
        items.append(item)
    return {"total": len(items), "items": items}


@router.patch("/api/admin/complaints/{complaint_id}/assign")
def admin_assign_complaint(
    complaint_id: str,
    payload: AdminAssignRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")

    dept = db.query(Department).filter(Department.department_id == payload.department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found.")

    officer = None
    if payload.assigned_officer_id:
        officer = db.query(Officer).filter(Officer.officer_id == payload.assigned_officer_id).first()
        if not officer or officer.department_id != dept.department_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected officer does not belong to the chosen department.",
            )
    else:
        # Auto-pick officer matching department & area if available
        if payload.area_id or complaint.area_id:
            target_area = payload.area_id or complaint.area_id
            officer = (
                db.query(Officer)
                .filter(Officer.department_id == dept.department_id, Officer.assigned_area_id == target_area)
                .first()
            )
        if not officer:
            officer = db.query(Officer).filter(Officer.department_id == dept.department_id).first()

    old_status = complaint.status
    new_status = "REOPENED" if payload.reopen else "ASSIGNED"

    complaint.department_id = dept.department_id
    complaint.assigned_officer_id = officer.officer_id if officer else None
    if payload.area_id:
        complaint.area_id = payload.area_id
    complaint.status = new_status
    complaint.routing_confidence = 1.0
    complaint.routing_reason = f"Confirmed by Administrator: {dept.department_name} ({dept.department_code})."

    remark = payload.remarks or f"Administrator assigned complaint to {dept.department_name}."
    db.add(
        StatusHistory(
            complaint_id=complaint.complaint_id,
            old_status=old_status,
            new_status=new_status,
            changed_by=current_user.user_id,
            remarks=remark,
        )
    )
    db.add(
        AuditLog(
            actor_id=current_user.user_id,
            action="ADMIN_ASSIGNED_COMPLAINT" if not payload.reopen else "ADMIN_REOPENED_COMPLAINT",
            entity_type="complaint",
            entity_id=complaint.complaint_id,
            details=remark,
        )
    )

    if officer and officer.user_id:
        db.add(
            Notification(
                user_id=officer.user_id,
                complaint_id=complaint.complaint_id,
                title=f"{'Reopened' if payload.reopen else 'Assigned'} Complaint: {complaint.reference_code}",
                message=remark,
            )
        )
    if complaint.reporter_id:
        db.add(
            Notification(
                user_id=complaint.reporter_id,
                complaint_id=complaint.complaint_id,
                title=f"Department Assignment Confirmed: {complaint.reference_code}",
                message=f"Your complaint has been routed to {dept.department_name}.",
            )
        )

    recalculate_complaint_priority(db, complaint)
    db.commit()
    db.refresh(complaint)
    return PublicComplaintSerializer.to_summary(complaint, current_user)


@router.get("/api/admin/officers")
def admin_list_officers(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    officers = db.query(Officer).all()
    return {
        "is_demo_data": True,
        "officers": [calculate_officer_performance(db, off) for off in officers],
    }


@router.post("/api/admin/officers", status_code=status.HTTP_201_CREATED)
def admin_create_officer(
    payload: OfficerCreateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == payload.email.lower().strip()).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists.")
    if db.query(Officer).filter(Officer.employee_id == payload.employee_id.strip()).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee ID already exists.")

    user = User(
        full_name=payload.full_name.strip(),
        email=payload.email.lower().strip(),
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role="officer",
        is_active=True,
    )
    db.add(user)
    db.flush()

    officer = Officer(
        user_id=user.user_id,
        department_id=payload.department_id,
        employee_id=payload.employee_id.strip(),
        assigned_area_id=payload.assigned_area_id or None,
        designation=payload.designation.strip(),
    )
    db.add(officer)
    db.add(
        AuditLog(
            actor_id=current_user.user_id,
            action="ADMIN_CREATED_OFFICER",
            entity_type="officer",
            entity_id=officer.officer_id,
            details=f"Created demo officer {payload.employee_id}.",
        )
    )
    db.commit()
    return calculate_officer_performance(db, officer)


@router.get("/api/admin/departments")
def admin_list_departments(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    depts = db.query(Department).order_by(Department.department_name.asc()).all()
    return {
        "departments": [
            {
                "department_id": d.department_id,
                "department_name": d.department_name,
                "department_code": d.department_code,
                "description": d.description,
                "is_active": d.is_active,
            }
            for d in depts
        ]
    }


@router.post("/api/admin/departments", status_code=status.HTTP_201_CREATED)
def admin_create_department(
    payload: DepartmentCreateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.query(Department).filter(Department.department_code == payload.department_code.strip()).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Department code already exists.")
    dept = Department(
        department_name=payload.department_name.strip(),
        department_code=payload.department_code.strip(),
        description=payload.description,
        is_active=True,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.post("/api/admin/areas", status_code=status.HTTP_201_CREATED)
def admin_create_area(
    payload: AreaCreateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.query(Area).filter(Area.ward_code == payload.ward_code.strip()).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ward code already exists.")

    delta = 0.012
    polygon = [
        [payload.center_lat - delta, payload.center_lng - delta],
        [payload.center_lat - delta, payload.center_lng + delta],
        [payload.center_lat + delta, payload.center_lng + delta],
        [payload.center_lat + delta, payload.center_lng - delta],
    ]
    area = Area(
        area_name=payload.area_name.strip(),
        ward_code=payload.ward_code.strip(),
        boundary_data={
            "center_lat": payload.center_lat,
            "center_lng": payload.center_lng,
            "radius_meters": payload.radius_meters,
            "verified_zone_tier": payload.verified_zone_tier,
            "polygon": polygon,
            "is_sample_boundary": True,
        },
        is_active=True,
    )
    db.add(area)
    db.add(
        AuditLog(
            actor_id=current_user.user_id,
            action="ADMIN_CREATED_AREA",
            entity_type="area",
            entity_id=area.area_id,
            details=f"Added pilot area {payload.area_name} ({payload.ward_code}).",
        )
    )
    db.commit()
    db.refresh(area)
    return area


@router.get("/api/admin/categories")
def admin_list_categories(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    cats = db.query(ComplaintCategory).order_by(ComplaintCategory.created_at.asc()).all()
    return {"categories": cats}


@router.post("/api/admin/categories", status_code=status.HTTP_201_CREATED)
def admin_create_category(
    payload: CategoryCreateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    key = payload.category_key.lower().strip().replace(" ", "_")
    if db.query(ComplaintCategory).filter(ComplaintCategory.category_key == key).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category key already exists.")
    cat = ComplaintCategory(
        category_key=key,
        display_name=payload.display_name.strip(),
        description=payload.description,
        base_safety_severity=payload.base_safety_severity,
        default_sla_hours=payload.default_sla_hours,
        is_active=True,
    )
    db.add(cat)
    db.add(
        AuditLog(
            actor_id=current_user.user_id,
            action="ADMIN_CREATED_CATEGORY",
            entity_type="category",
            entity_id=key,
            details=f"Configured category {payload.display_name} with {payload.default_sla_hours}h SLA.",
        )
    )
    db.commit()
    db.refresh(cat)
    return cat


@router.patch("/api/admin/categories/{category_id}")
def admin_update_category(
    category_id: str,
    payload: CategoryUpdateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    cat = db.query(ComplaintCategory).filter(ComplaintCategory.category_id == category_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    if payload.display_name is not None:
        cat.display_name = payload.display_name.strip()
    if payload.description is not None:
        cat.description = payload.description
    if payload.base_safety_severity is not None:
        cat.base_safety_severity = payload.base_safety_severity
    if payload.default_sla_hours is not None:
        cat.default_sla_hours = payload.default_sla_hours
    if payload.is_active is not None:
        cat.is_active = payload.is_active

    db.add(
        AuditLog(
            actor_id=current_user.user_id,
            action="ADMIN_UPDATED_CATEGORY",
            entity_type="category",
            entity_id=cat.category_key,
            details=f"Updated SLA={cat.default_sla_hours}h, safety={cat.base_safety_severity}.",
        )
    )
    db.commit()
    db.refresh(cat)
    return cat


@router.get("/api/admin/jurisdictions")
def admin_list_jurisdictions(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.query(JurisdictionMapping).all()
    return {
        "is_demo_data": True,
        "jurisdictions": [
            {
                "mapping_id": j.mapping_id,
                "department_id": j.department_id,
                "department_name": j.department.department_name if j.department else None,
                "department_code": j.department.department_code if j.department else None,
                "area_id": j.area_id,
                "area_name": j.area.area_name if j.area else None,
                "complaint_category": j.complaint_category,
                "ownership_type": j.ownership_type,
                "confidence_or_source_notes": j.confidence_or_source_notes,
                "is_active": j.is_active,
            }
            for j in rows
        ],
    }


@router.post("/api/admin/jurisdictions", status_code=status.HTTP_201_CREATED)
def admin_create_jurisdiction(
    payload: JurisdictionCreateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    mapping = JurisdictionMapping(
        department_id=payload.department_id,
        area_id=payload.area_id,
        complaint_category=payload.complaint_category,
        ownership_type=payload.ownership_type,
        confidence_or_source_notes=payload.confidence_or_source_notes,
        is_active=True,
    )
    db.add(mapping)
    db.add(
        AuditLog(
            actor_id=current_user.user_id,
            action="ADMIN_CREATED_JURISDICTION",
            entity_type="jurisdiction",
            entity_id=mapping.mapping_id,
            details=f"Mapped {payload.complaint_category} in area {payload.area_id} to dept {payload.department_id}.",
        )
    )
    db.commit()
    db.refresh(mapping)
    return {
        "mapping_id": mapping.mapping_id,
        "department_id": mapping.department_id,
        "area_id": mapping.area_id,
        "complaint_category": mapping.complaint_category,
        "ownership_type": mapping.ownership_type,
        "confidence_or_source_notes": mapping.confidence_or_source_notes,
        "is_active": mapping.is_active,
    }


@router.get("/api/admin/escalations")
def admin_list_escalations(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    records = db.query(EscalationRecord).order_by(EscalationRecord.created_at.desc()).all()
    return {
        "escalations": [
            {
                "escalation_id": e.escalation_id,
                "complaint_id": e.complaint_id,
                "reference_code": e.complaint.reference_code if e.complaint else None,
                "category": e.complaint.category if e.complaint else None,
                "status": e.complaint.status if e.complaint else None,
                "priority_level": e.complaint.priority_level if e.complaint else None,
                "department_name": e.complaint.department.department_name if e.complaint and e.complaint.department else None,
                "area_name": e.complaint.area.area_name if e.complaint and e.complaint.area else None,
                "escalation_level": e.escalation_level,
                "reason": e.reason,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in records
        ]
    }


@router.post("/api/admin/escalations/run-check")
def admin_trigger_escalation_sweep(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    created = run_escalation_sweep(db)
    return {"new_escalations_recorded": len(created)}


@router.patch("/api/admin/recurrence/{recurrence_id}")
def admin_review_recurrence(
    recurrence_id: str,
    payload: RecurrenceReviewRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    link = db.query(RecurrenceLink).filter(RecurrenceLink.recurrence_id == recurrence_id).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurrence link not found.")
    link.review_status = payload.review_status
    db.add(
        AuditLog(
            actor_id=current_user.user_id,
            action=f"RECURRENCE_{payload.review_status}",
            entity_type="recurrence_link",
            entity_id=recurrence_id,
            details=f"Administrator marked recurrence link as {payload.review_status}.",
        )
    )
    db.commit()
    return {"recurrence_id": link.recurrence_id, "review_status": link.review_status}


@router.get("/api/admin/audit-logs")
def admin_audit_logs(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    actor_map = {u.user_id: u.full_name for u in db.query(User).all()}
    return {
        "logs": [
            {
                "log_id": l.log_id,
                "actor_name": actor_map.get(l.actor_id, "System / Anonymous") if l.actor_id else "System / Anonymous",
                "action": l.action,
                "entity_type": l.entity_type,
                "entity_id": l.entity_id,
                "details": l.details,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ]
    }


@router.get("/api/admin/analytics")
def admin_analytics(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    complaints = db.query(Complaint).all()
    total = len(complaints)
    new_count = sum(1 for c in complaints if c.status == "SUBMITTED")
    pending_assignment = sum(1 for c in complaints if c.status == "UNDER_REVIEW")
    overdue_count = sum(1 for c in complaints if c.status == "OVERDUE")
    high_priority_count = sum(1 for c in complaints if c.priority_level in ("High", "Critical"))
    disputed_count = sum(1 for c in complaints if c.status == "DISPUTED")
    verified_count = sum(1 for c in complaints if c.status == "RESOLVED_VERIFIED")

    recurrence_links = db.query(RecurrenceLink).filter(RecurrenceLink.review_status != "DISMISSED").all()
    recurring_ids = {l.new_complaint_id for l in recurrence_links}

    by_department: dict[str, int] = {}
    by_area: dict[str, int] = {}
    by_category: dict[str, int] = {}
    by_status: dict[str, int] = {}
    for c in complaints:
        dname = c.department.department_code if c.department else "UNASSIGNED"
        by_department[dname] = by_department.get(dname, 0) + 1
        aname = c.area.area_name if c.area else "Outside Pilot"
        by_area[aname] = by_area.get(aname, 0) + 1
        by_category[c.category] = by_category.get(c.category, 0) + 1
        by_status[c.status] = by_status.get(c.status, 0) + 1

    officers = db.query(Officer).all()
    officer_perf = [calculate_officer_performance(db, o) for o in officers]

    return {
        "summary": {
            "total_complaints": total,
            "new_complaints": new_count,
            "pending_assignment": pending_assignment,
            "overdue_complaints": overdue_count,
            "recurring_issues": len(recurring_ids),
            "high_priority_complaints": high_priority_count,
            "verification_disputes": disputed_count,
            "verified_resolutions": verified_count,
        },
        "by_department": [{"name": k, "count": v} for k, v in by_department.items()],
        "by_area": [{"name": k, "count": v} for k, v in by_area.items()],
        "by_category": [{"name": k, "count": v} for k, v in by_category.items()],
        "by_status": [{"name": k, "count": v} for k, v in by_status.items()],
        "officer_performance": officer_perf,
        "is_demo_data": True,
    }
