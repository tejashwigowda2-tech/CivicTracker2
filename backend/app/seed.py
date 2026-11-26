from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from .auth import hash_password
from .config import UPLOADS_DIR
from .models import (
    Area,
    AuditLog,
    Complaint,
    ComplaintCategory,
    ComplaintImage,
    ComplaintSupport,
    Department,
    EscalationRecord,
    JurisdictionMapping,
    Notification,
    Officer,
    Recognition,
    RecurrenceLink,
    StatusHistory,
    User,
    VerificationVote,
)
from .services.priority import compute_priority


def _demo_photo(filename: str) -> str:
    """Returns the served URL for a verified real sample photograph stored in uploads/."""
    path: Path = UPLOADS_DIR / filename
    if path.exists():
        return f"/api/uploads/{filename}"
    return f"/api/uploads/{filename}"


def seed_database_if_empty(db: Session) -> None:
    if db.query(User).count() > 0:
        return

    now = datetime.now(timezone.utc)

    # Distinct real sample photographs (no synthetic drawings)
    img_pothole_1 = _demo_photo("demo_pothole_1.jpg")
    img_pothole_2 = _demo_photo("demo_pothole_2.jpg")
    img_pothole_3 = _demo_photo("demo_pothole_3.jpg")
    img_pothole_4 = _demo_photo("demo_pothole_4.jpg")
    img_road_after_1 = _demo_photo("demo_road_repair_1.jpg")
    img_road_after_2 = _demo_photo("demo_road_repair_2.jpg")
    img_road_after_3 = _demo_photo("demo_road_after_clean.jpg")

    img_garbage_1 = _demo_photo("demo_garbage_1.jpg")
    img_garbage_2 = _demo_photo("demo_garbage_2.jpg")
    img_garbage_3 = _demo_photo("demo_garbage_3.jpg")
    img_garbage_after_1 = _demo_photo("demo_garbage_after_1.jpg")
    img_garbage_after_2 = _demo_photo("demo_garbage_after_2.jpg")

    img_drain_1 = _demo_photo("demo_drain_1.jpg")
    img_drain_2 = _demo_photo("demo_drain_2.jpg")
    img_drain_3 = _demo_photo("demo_drain_3.jpg")
    img_drain_after_1 = _demo_photo("demo_drain_after_1.jpg")
    img_drain_after_2 = _demo_photo("demo_drain_after_2.jpg")

    # 1. Categories
    cat_pothole = ComplaintCategory(
        category_key="potholes_road_damage",
        display_name="Potholes & Road Damage",
        description="Damaged asphalt, road craters, sunken manholes, and carriageway hazards.",
        base_safety_severity=78.0,
        default_sla_hours=48,
    )
    cat_garbage = ComplaintCategory(
        category_key="garbage_accumulation",
        display_name="Garbage Accumulation",
        description="Uncollected waste piles, overflowing bins, and illegal roadside dumping.",
        base_safety_severity=58.0,
        default_sla_hours=36,
    )
    cat_drain = ComplaintCategory(
        category_key="drainage_blockage",
        display_name="Drainage Blockage",
        description="Clogged stormwater drains, sewage overflow, and street waterlogging.",
        base_safety_severity=74.0,
        default_sla_hours=48,
    )
    db.add_all([cat_pothole, cat_garbage, cat_drain])
    db.flush()

    # 2. Sample Bengaluru Pilot Areas (clearly labelled demonstration boundaries)
    area_ind = Area(
        area_name="Indiranagar Pilot Zone (Demo)",
        ward_code="BLR-PILOT-IND",
        boundary_data={
            "center_lat": 12.9784,
            "center_lng": 77.6408,
            "radius_meters": 2400,
            "verified_zone_tier": "high_footfall_pilot",
            "is_sample_boundary": True,
            "polygon": [
                [12.967, 77.628],
                [12.967, 77.654],
                [12.990, 77.654],
                [12.990, 77.628],
            ],
        },
    )
    area_krm = Area(
        area_name="Koramangala Pilot Zone (Demo)",
        ward_code="BLR-PILOT-KRM",
        boundary_data={
            "center_lat": 12.9352,
            "center_lng": 77.6245,
            "radius_meters": 2400,
            "verified_zone_tier": "high_footfall_pilot",
            "is_sample_boundary": True,
            "polygon": [
                [12.923, 77.611],
                [12.923, 77.638],
                [12.947, 77.638],
                [12.947, 77.611],
            ],
        },
    )
    area_jyn = Area(
        area_name="Jayanagar Pilot Zone (Demo)",
        ward_code="BLR-PILOT-JYN",
        boundary_data={
            "center_lat": 12.9299,
            "center_lng": 77.5824,
            "radius_meters": 2400,
            "verified_zone_tier": "urban_pilot",
            "is_sample_boundary": True,
            "polygon": [
                [12.918, 77.569],
                [12.918, 77.596],
                [12.942, 77.596],
                [12.942, 77.569],
            ],
        },
    )
    area_wtf = Area(
        area_name="Whitefield Pilot Zone (Demo)",
        ward_code="BLR-PILOT-WTF",
        boundary_data={
            "center_lat": 12.9698,
            "center_lng": 77.7500,
            "radius_meters": 2800,
            "verified_zone_tier": "urban_pilot",
            "is_sample_boundary": True,
            "polygon": [
                [12.955, 77.734],
                [12.955, 77.766],
                [12.985, 77.766],
                [12.985, 77.734],
            ],
        },
    )
    db.add_all([area_ind, area_krm, area_jyn, area_wtf])
    db.flush()

    # 3. Independent Demonstration Departments
    dept_roads = Department(
        department_name="Road & Carriageway Maintenance Queue (Demo)",
        department_code="ROADS-DEMO",
        description="CivicTrack simulated road & pothole response queue (independent demo; inspired by municipal road engineering workflows).",
    )
    dept_waste = Department(
        department_name="Solid Waste & Street Sanitation Queue (Demo)",
        department_code="SANITATION-DEMO",
        description="CivicTrack simulated solid waste collection & cleaning queue (independent demo).",
    )
    dept_drain = Department(
        department_name="Stormwater & Sewerage Maintenance Queue (Demo)",
        department_code="DRAINS-DEMO",
        description="CivicTrack simulated drainage and sewerage response queue (independent demo).",
    )
    dept_elec = Department(
        department_name="Streetlight & Utility Corridor Queue (Demo)",
        department_code="UTILITY-DEMO",
        description="CivicTrack simulated utility & electrical corridor queue for multi-agency routing demos.",
    )
    db.add_all([dept_roads, dept_waste, dept_drain, dept_elec])
    db.flush()

    # 4. Sample Hybrid Jurisdiction Mappings
    mappings = [
        # Indiranagar
        JurisdictionMapping(department_id=dept_roads.department_id, area_id=area_ind.area_id, complaint_category="potholes_road_damage", ownership_type="Sample Municipal Road Ward", confidence_or_source_notes="High-confidence sample mapping for Indiranagar inner streets."),
        JurisdictionMapping(department_id=dept_waste.department_id, area_id=area_ind.area_id, complaint_category="garbage_accumulation", ownership_type="Sample Sanitation Block", confidence_or_source_notes="High-confidence sample mapping for Indiranagar collection beat."),
        JurisdictionMapping(department_id=dept_drain.department_id, area_id=area_ind.area_id, complaint_category="drainage_blockage", ownership_type="Sample Sewerage & Drain Zone", confidence_or_source_notes="High-confidence sample mapping for Indiranagar drain network."),
        # Koramangala
        JurisdictionMapping(department_id=dept_roads.department_id, area_id=area_krm.area_id, complaint_category="potholes_road_damage", ownership_type="Sample Municipal Road Ward", confidence_or_source_notes="High-confidence sample mapping for Koramangala blocks."),
        JurisdictionMapping(department_id=dept_waste.department_id, area_id=area_krm.area_id, complaint_category="garbage_accumulation", ownership_type="Sample Sanitation Block", confidence_or_source_notes="High-confidence sample mapping for Koramangala."),
        JurisdictionMapping(department_id=dept_drain.department_id, area_id=area_krm.area_id, complaint_category="drainage_blockage", ownership_type="Sample Sewerage & Drain Zone", confidence_or_source_notes="High-confidence sample mapping for Koramangala."),
        # Jayanagar
        JurisdictionMapping(department_id=dept_roads.department_id, area_id=area_jyn.area_id, complaint_category="potholes_road_damage", ownership_type="Sample Municipal Road Ward", confidence_or_source_notes="High-confidence sample mapping for Jayanagar."),
        JurisdictionMapping(department_id=dept_waste.department_id, area_id=area_jyn.area_id, complaint_category="garbage_accumulation", ownership_type="Sample Sanitation Block", confidence_or_source_notes="High-confidence sample mapping for Jayanagar."),
        JurisdictionMapping(department_id=dept_drain.department_id, area_id=area_jyn.area_id, complaint_category="drainage_blockage", ownership_type="Sample Sewerage & Drain Zone", confidence_or_source_notes="High-confidence sample mapping for Jayanagar."),
        # Whitefield (intentional shared/ambiguous ownership demo for drainage)
        JurisdictionMapping(department_id=dept_roads.department_id, area_id=area_wtf.area_id, complaint_category="potholes_road_damage", ownership_type="Sample Arterial Road Corridor", confidence_or_source_notes="Sample mapping for Whitefield pilot roads."),
        JurisdictionMapping(department_id=dept_waste.department_id, area_id=area_wtf.area_id, complaint_category="garbage_accumulation", ownership_type="Sample Sanitation Block", confidence_or_source_notes="Sample mapping for Whitefield."),
        JurisdictionMapping(department_id=dept_drain.department_id, area_id=area_wtf.area_id, complaint_category="drainage_blockage", ownership_type="Ambiguous / Shared Industrial-Municipal Drain", confidence_or_source_notes="Shared boundary requires Administrator confirmation."),
    ]
    db.add_all(mappings)
    db.flush()

    # 5. Users: Admin, 4 Demo Officers, 4 Demo Citizens
    admin_user = User(
        full_name="Priya Nair (Demo Admin)",
        email="admin@civictrack.demo",
        phone="+91-90000-00001",
        password_hash=hash_password("Admin@123"),
        role="admin",
    )
    cit1 = User(full_name="Ananya Rao", email="ananya@citizen.demo", phone="+91-98801-11111", password_hash=hash_password("Citizen@123"), role="citizen")
    cit2 = User(full_name="Rohan Deshmukh", email="rohan@citizen.demo", phone="+91-98801-22222", password_hash=hash_password("Citizen@123"), role="citizen")
    cit3 = User(full_name="Meera Krishnan", email="meera@citizen.demo", phone="+91-98801-33333", password_hash=hash_password("Citizen@123"), role="citizen")
    cit4 = User(full_name="Karthik Hegde", email="karthik@citizen.demo", phone="+91-98801-44444", password_hash=hash_password("Citizen@123"), role="citizen")

    off_u1 = User(full_name="Vikram Shetty (Demo Officer)", email="vikram.roads@civictrack.demo", phone="+91-97701-10101", password_hash=hash_password("Officer@123"), role="officer")
    off_u2 = User(full_name="Deepa Kulkarni (Demo Officer)", email="deepa.sanitation@civictrack.demo", phone="+91-97701-10102", password_hash=hash_password("Officer@123"), role="officer")
    off_u3 = User(full_name="Arjun Menon (Demo Officer)", email="arjun.drains@civictrack.demo", phone="+91-97701-10103", password_hash=hash_password("Officer@123"), role="officer")
    off_u4 = User(full_name="Kavya Sharma (Demo Officer)", email="kavya.roads@civictrack.demo", phone="+91-97701-10104", password_hash=hash_password("Officer@123"), role="officer")

    db.add_all([admin_user, cit1, cit2, cit3, cit4, off_u1, off_u2, off_u3, off_u4])
    db.flush()

    off1 = Officer(user_id=off_u1.user_id, department_id=dept_roads.department_id, employee_id="EMP-DEMO-101", assigned_area_id=area_ind.area_id, designation="Assistant Road Engineer (Demo)")
    off2 = Officer(user_id=off_u2.user_id, department_id=dept_waste.department_id, employee_id="EMP-DEMO-102", assigned_area_id=area_krm.area_id, designation="Sanitation Supervisor (Demo)")
    off3 = Officer(user_id=off_u3.user_id, department_id=dept_drain.department_id, employee_id="EMP-DEMO-103", assigned_area_id=area_krm.area_id, designation="Drainage Maintenance Officer (Demo)")
    off4 = Officer(user_id=off_u4.user_id, department_id=dept_roads.department_id, employee_id="EMP-DEMO-104", assigned_area_id=area_jyn.area_id, designation="Zone Field Engineer (Demo)")
    db.add_all([off1, off2, off3, off4])
    db.flush()

    # 6. Helper to create sample complaint with timeline & images
    def add_complaint(
        ref: str,
        cat: str,
        desc: str,
        lat: float,
        lng: float,
        addr: str,
        area: Area,
        dept: Department | None,
        officer: Officer | None,
        status_val: str,
        days_ago: int,
        reporter: User | None,
        before_img: str,
        after_img: str | None = None,
        supporters: list[User] | None = None,
        votes: list[tuple[User, str]] | None = None,
        anonymous: bool = False,
        confidential: bool = False,
        overdue_hours: int = 0,
        recurrence_count: int = 0,
        internal_note: str | None = None,
    ) -> Complaint:
        created = now - timedelta(days=days_ago)
        due = now - timedelta(hours=overdue_hours) if overdue_hours > 0 else created + timedelta(hours=48)
        resolved = created + timedelta(hours=28) if status_val == "RESOLVED_VERIFIED" else None
        comp_req = created + timedelta(hours=20) if status_val in ("AWAITING_VERIFICATION", "RESOLVED_VERIFIED", "DISPUTED") else None

        sup_list = supporters or []
        prio = compute_priority(
            db=db,
            category=cat,
            description=desc,
            severity_hint="High" if "deep" in desc.lower() or "overflow" in desc.lower() else "Medium",
            support_count=len(sup_list),
            recurrence_count=recurrence_count,
            area_id=area.area_id,
            created_at=created,
            status=status_val,
        )

        c = Complaint(
            reference_code=ref,
            reporter_id=None if anonymous else (reporter.user_id if reporter else None),
            category=cat,
            description=desc,
            latitude=lat,
            longitude=lng,
            address_hint=addr,
            area_id=area.area_id,
            department_id=dept.department_id if dept else None,
            assigned_officer_id=officer.officer_id if officer else None,
            priority_score=prio["priority_score"],
            priority_level=prio["priority_level"],
            priority_explanation=prio["priority_explanation"],
            status=status_val,
            anonymous=anonymous,
            is_confidential=confidential,
            confidential_contact="confidential-demo@example.invalid" if confidential else None,
            classification_confidence=0.84,
            classification_mode="heuristic_fallback",
            ai_suggested_category=cat,
            routing_reason=f"Sample jurisdiction mapping for {area.area_name}." if dept else "Pending administrator routing confirmation.",
            routing_confidence=0.89 if dept else 0.52,
            internal_remarks=internal_note,
            completion_requested_at=comp_req,
            due_at=due,
            created_at=created,
            resolved_at=resolved,
        )
        db.add(c)
        db.flush()

        db.add(ComplaintImage(complaint_id=c.complaint_id, image_url=before_img, image_type="BEFORE", uploaded_by=c.reporter_id, uploaded_at=created))
        if after_img:
            db.add(ComplaintImage(complaint_id=c.complaint_id, image_url=after_img, image_type="AFTER", uploaded_by=officer.user_id if officer else None, uploaded_at=comp_req or (created + timedelta(hours=20))))

        for s_user in sup_list:
            db.add(ComplaintSupport(complaint_id=c.complaint_id, user_id=s_user.user_id, created_at=created + timedelta(hours=1)))

        if votes:
            for v_user, v_val in votes:
                db.add(VerificationVote(complaint_id=c.complaint_id, user_id=v_user.user_id, vote=v_val, created_at=created + timedelta(hours=24)))

        # Timeline
        db.add(StatusHistory(complaint_id=c.complaint_id, old_status=None, new_status="SUBMITTED", changed_by=c.reporter_id, remarks="Demo complaint submitted with photo evidence.", changed_at=created))
        if status_val != "SUBMITTED":
            if status_val == "UNDER_REVIEW":
                db.add(StatusHistory(complaint_id=c.complaint_id, old_status="SUBMITTED", new_status="UNDER_REVIEW", remarks="Ambiguous sample jurisdiction routed to Administrator Review.", changed_at=created + timedelta(minutes=5)))
            else:
                db.add(StatusHistory(complaint_id=c.complaint_id, old_status="SUBMITTED", new_status="ASSIGNED", remarks=f"Assigned to {dept.department_name if dept else 'Demo Queue'}.", changed_at=created + timedelta(hours=2)))
        if status_val in ("IN_PROGRESS", "AWAITING_VERIFICATION", "RESOLVED_VERIFIED", "DISPUTED", "REOPENED"):
            db.add(StatusHistory(complaint_id=c.complaint_id, old_status="ASSIGNED", new_status="IN_PROGRESS", changed_by=officer.user_id if officer else None, remarks="Field inspection and repair started.", changed_at=created + timedelta(hours=8)))
        if status_val in ("AWAITING_VERIFICATION", "RESOLVED_VERIFIED", "DISPUTED"):
            db.add(StatusHistory(complaint_id=c.complaint_id, old_status="IN_PROGRESS", new_status="AWAITING_VERIFICATION", changed_by=officer.user_id if officer else None, remarks="After-repair photograph uploaded; open for supporter verification.", changed_at=comp_req))
        if status_val == "RESOLVED_VERIFIED":
            db.add(StatusHistory(complaint_id=c.complaint_id, old_status="AWAITING_VERIFICATION", new_status="RESOLVED_VERIFIED", remarks="Verified as resolved by original supporters.", changed_at=resolved))
        if status_val == "DISPUTED":
            db.add(StatusHistory(complaint_id=c.complaint_id, old_status="AWAITING_VERIFICATION", new_status="DISPUTED", remarks="Supporters disputed completion; issue persists on site.", changed_at=created + timedelta(hours=26)))
        if status_val == "REOPENED":
            db.add(StatusHistory(complaint_id=c.complaint_id, old_status="DISPUTED", new_status="REOPENED", changed_by=admin_user.user_id, remarks="Administrator reopened complaint for corrective repair.", changed_at=created + timedelta(hours=30)))
        if status_val == "OVERDUE":
            db.add(StatusHistory(complaint_id=c.complaint_id, old_status="ASSIGNED", new_status="OVERDUE", remarks=f"SLA deadline exceeded by {overdue_hours} hours; escalated internally.", changed_at=due + timedelta(minutes=15)))
            db.add(EscalationRecord(complaint_id=c.complaint_id, escalation_level=2 if overdue_hours >= 24 else 1, reason=f"Demonstration SLA deadline exceeded by {overdue_hours}h.", created_at=due + timedelta(minutes=15)))

        return c

    # --- 16+ Seeded Demonstration Complaints (Distinct Real Photographs) ---

    # Recurrence Chain 1: Indiranagar 100ft Rd Pothole (Jan resolved -> Recent recurring)
    c_old_pothole = add_complaint(
        "CT-2026-0001", "potholes_road_damage",
        "Collapsed road surface cavity near 100 Feet Road & 12th Main junction causing two-wheeler swerving.",
        12.9781, 77.6405, "100 Feet Road, 12th Main Junction, Indiranagar (Demo)",
        area_ind, dept_roads, off1, "RESOLVED_VERIFIED", days_ago=45,
        reporter=cit1, before_img=img_pothole_1, after_img=img_road_after_1,
        supporters=[cit1, cit2, cit3], votes=[(cit1, "WORK_COMPLETED"), (cit2, "WORK_COMPLETED")],
        internal_note="Cold-mix asphalt patch completed (demo).",
    )
    c_new_pothole_rec = add_complaint(
        "CT-2026-0002", "potholes_road_damage",
        "Water-filled potholes reappeared after rain at the 100ft Rd & 12th Main corner.",
        12.9782, 77.6406, "100 Feet Road, near 12th Main, Indiranagar (Demo)",
        area_ind, dept_roads, off1, "IN_PROGRESS", days_ago=2,
        reporter=cit2, before_img=img_pothole_2,
        supporters=[cit1, cit2, cit3, cit4], recurrence_count=1,
        internal_note="Hot-mix resurfacing scheduled due to recurring failure.",
    )

    # Recurrence Chain 2: Koramangala 4th Block Drainage (Resolved earlier -> Recurring)
    c_old_drain = add_complaint(
        "CT-2026-0003", "drainage_blockage",
        "Stormwater drain gully blocked with silt near 80ft Road bus stop causing curb waterlogging.",
        12.9355, 77.6248, "80 Feet Road, Koramangala 4th Block (Demo)",
        area_krm, dept_drain, off3, "RESOLVED_VERIFIED", days_ago=38,
        reporter=cit3, before_img=img_drain_1, after_img=img_drain_after_1,
        supporters=[cit3, cit4], votes=[(cit3, "WORK_COMPLETED"), (cit4, "WORK_COMPLETED")],
    )
    c_new_drain_rec = add_complaint(
        "CT-2026-0004", "drainage_blockage",
        "Drainage overflow returned at 80ft Road junction; stagnant wastewater flooding pedestrian lane.",
        12.9356, 77.6249, "80 Feet Road Cross, Koramangala 4th Block (Demo)",
        area_krm, dept_drain, off3, "OVERDUE", days_ago=5,
        reporter=cit4, before_img=img_drain_2,
        supporters=[cit1, cit3, cit4], overdue_hours=32, recurrence_count=1,
    )

    # Awaiting Verification (ready for logged-in citizen cit1/cit2/cit3 to test Verify UI!)
    c_await_1 = add_complaint(
        "CT-2026-0005", "potholes_road_damage",
        "Crumbled asphalt trench outside CMH Road metro entrance resurfaced with hot-mix tar.",
        12.9789, 77.6382, "CMH Road Metro Side, Indiranagar (Demo)",
        area_ind, dept_roads, off1, "AWAITING_VERIFICATION", days_ago=3,
        reporter=cit1, before_img=img_pothole_4, after_img=img_road_after_2,
        supporters=[cit1, cit2, cit3],
        internal_note="Resurfaced 4 sqm trench; awaiting citizen confirmation.",
    )
    c_await_2 = add_complaint(
        "CT-2026-0006", "garbage_accumulation",
        "Overflowing public dustbin near Koramangala 6th Block park cleared and street washed.",
        12.9372, 77.6225, "6th Block Park Corner, Koramangala (Demo)",
        area_krm, dept_waste, off2, "AWAITING_VERIFICATION", days_ago=2,
        reporter=cit2, before_img=img_garbage_1, after_img=img_garbage_after_2,
        supporters=[cit1, cit2, cit4],
    )

    # Disputed Complaint
    add_complaint(
        "CT-2026-0007", "garbage_accumulation",
        "Overflowing roadside waste dump near Sony World Signal; partial cleanup left waste behind.",
        12.9341, 77.6269, "Near Sony World Junction, Koramangala (Demo)",
        area_krm, dept_waste, off2, "DISPUTED", days_ago=4,
        reporter=cit3, before_img=img_garbage_3, after_img=img_garbage_after_1,
        supporters=[cit1, cit2, cit3],
        votes=[(cit1, "ISSUE_STILL_EXISTS"), (cit2, "ISSUE_STILL_EXISTS")],
    )

    # Overdue Complaints
    add_complaint(
        "CT-2026-0008", "potholes_road_damage",
        "Dangerous flooded pothole stretch near Jayanagar 4th Block Shopping Complex exit.",
        12.9288, 77.5835, "11th Main, Jayanagar 4th Block (Demo)",
        area_jyn, dept_roads, off4, "OVERDUE", days_ago=6,
        reporter=cit4, before_img=img_pothole_3,
        supporters=[cit1, cit2, cit3, cit4], overdue_hours=54,
    )

    # Under Review (Ambiguous jurisdiction in Whitefield)
    add_complaint(
        "CT-2026-0009", "drainage_blockage",
        "Blocked stormwater alley drain causing standing wastewater near ITPB Main Road.",
        12.9712, 77.7485, "ITPB Main Road, Whitefield (Demo)",
        area_wtf, dept_drain, None, "UNDER_REVIEW", days_ago=1,
        reporter=cit1, before_img=img_drain_3,
        supporters=[cit1, cit3],
    )

    # Assigned & ready for Officer EMP-DEMO-101 to click Start Work!
    add_complaint(
        "CT-2026-0010", "potholes_road_damage",
        "Broken carriageway edge near Indiranagar BDA Complex causing traffic bottleneck.",
        12.9765, 77.6422, "Near BDA Complex, Indiranagar (Demo)",
        area_ind, dept_roads, off1, "ASSIGNED", days_ago=1,
        reporter=cit2, before_img=img_pothole_2,
        supporters=[cit2, cit3],
    )

    # Anonymous & Confidential examples
    add_complaint(
        "CT-2026-0011", "garbage_accumulation",
        "Overflowing street litter bin and uncollected bags near Jayanagar 3rd Block lane.",
        12.9315, 77.5812, "8th Cross, Jayanagar 3rd Block (Demo)",
        area_jyn, dept_waste, off2, "ASSIGNED", days_ago=1,
        reporter=None, before_img=img_garbage_2,
        supporters=[cit4], anonymous=True,
    )
    add_complaint(
        "CT-2026-0012", "drainage_blockage",
        "Clogged roadside drain and wastewater seepage near residential lane; confidential contact provided.",
        12.9338, 77.6210, "Koramangala 5th Block (Demo)",
        area_krm, dept_drain, off3, "IN_PROGRESS", days_ago=2,
        reporter=cit3, before_img=img_drain_1,
        supporters=[cit1, cit3], confidential=True,
        internal_note="Safety barricade placed; drain desilting ordered.",
    )

    # Reopened Complaint
    add_complaint(
        "CT-2026-0013", "potholes_road_damage",
        "Sub-standard patch subsided within 48 hours on Jayanagar 9th Block cross road.",
        12.9255, 77.5861, "Jayanagar 9th Block (Demo)",
        area_jyn, dept_roads, off4, "REOPENED", days_ago=7,
        reporter=cit1, before_img=img_pothole_4,
        supporters=[cit1, cit2, cit4],
    )

    # Additional Verified & Submitted complaints for rich analytics
    add_complaint(
        "CT-2026-0014", "garbage_accumulation",
        "Dry waste pile outside Whitefield Hope Farm bus shelter.",
        12.9740, 77.7525, "Hope Farm Signal, Whitefield (Demo)",
        area_wtf, dept_waste, off2, "SUBMITTED", days_ago=0,
        reporter=cit2, before_img=img_garbage_3,
        supporters=[cit2],
    )
    add_complaint(
        "CT-2026-0015", "potholes_road_damage",
        "Multiple surface potholes repaved cleanly near Jayanagar Metro Station.",
        12.9309, 77.5801, "RV Road, Jayanagar (Demo)",
        area_jyn, dept_roads, off4, "RESOLVED_VERIFIED", days_ago=18,
        reporter=cit4, before_img=img_pothole_1, after_img=img_road_after_3,
        supporters=[cit1, cit4], votes=[(cit1, "WORK_COMPLETED"), (cit4, "WORK_COMPLETED")],
    )
    add_complaint(
        "CT-2026-0016", "garbage_accumulation",
        "Cleared illegal roadside waste and sanitized pavement in Indiranagar 6th Main.",
        12.9752, 77.6375, "6th Main, HAL 2nd Stage, Indiranagar (Demo)",
        area_ind, dept_waste, off2, "RESOLVED_VERIFIED", days_ago=14,
        reporter=cit3, before_img=img_garbage_1, after_img=img_garbage_after_1,
        supporters=[cit2, cit3], votes=[(cit2, "WORK_COMPLETED"), (cit3, "WORK_COMPLETED")],
    )

    db.flush()

    # 7. Recurrence Links
    db.add(
        RecurrenceLink(
            previous_complaint_id=c_old_pothole.complaint_id,
            new_complaint_id=c_new_pothole_rec.complaint_id,
            similarity_reason="Same category (potholes_road_damage) reported 14.8m from verified historical complaint CT-2026-0001.",
            review_status="CONFIRMED",
        )
    )
    db.add(
        RecurrenceLink(
            previous_complaint_id=c_old_drain.complaint_id,
            new_complaint_id=c_new_drain_rec.complaint_id,
            similarity_reason="Same category (drainage_blockage) reported 15.2m from verified historical complaint CT-2026-0003.",
            review_status="CONFIRMED",
        )
    )

    # 8. Quality-Based Officer Recognition Badges (Demo)
    db.add_all([
        Recognition(officer_id=off1.officer_id, badge_name="Quick Responder", reason="Consistent acknowledgement under 6 hours on Indiranagar road safety issues (Demo)."),
        Recognition(officer_id=off1.officer_id, badge_name="Quality Performer", reason="100% citizen verification approval on completed Indiranagar road repairs (Demo)."),
        Recognition(officer_id=off2.officer_id, badge_name="Community Hero", reason="High citizen participation and rapid sanitation turnaround in pilot blocks (Demo)."),
        Recognition(officer_id=off4.officer_id, badge_name="Consistency Champion", reason="Zero overdue complaints across Jayanagar verified resolutions (Demo)."),
        Recognition(officer_id=off3.officer_id, badge_name="Problem Solver", reason="Resolved high-risk drainage blockage with full photo evidence (Demo)."),
    ])

    # 9. Initial Notifications & Audit Log
    db.add_all([
        Notification(user_id=cit1.user_id, complaint_id=c_await_1.complaint_id, title="Verification Requested: CT-2026-0005", message="Before-and-after repair evidence is ready for your verification."),
        Notification(user_id=cit2.user_id, complaint_id=c_await_2.complaint_id, title="Verification Requested: CT-2026-0006", message="Please review the sanitation cleanup photos and cast your verification vote."),
        Notification(user_id=off_u1.user_id, complaint_id=c_new_pothole_rec.complaint_id, title="Recurring High-Priority Issue: CT-2026-0002", message="Recurring pothole on 100 Feet Road Indiranagar requires durable repair."),
        Notification(user_id=admin_user.user_id, complaint_id=c_new_drain_rec.complaint_id, title="Overdue Escalation Alert: CT-2026-0004", message="Drainage complaint in Koramangala exceeded SLA deadline."),
        AuditLog(actor_id=admin_user.user_id, action="DEMO_SEED_INITIALIZED", entity_type="system", entity_id="civictrack", details="Seeded 16 demonstration complaints, 4 pilot areas, 4 demo departments, 4 officers, and recurrence chains."),
    ])

    db.commit()
