import io
import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

# Ensure backend directory is importable and use an isolated test DB
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
TEST_DB = BACKEND_DIR / "test_civictrack.db"
if TEST_DB.exists():
    TEST_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"

from app.database import engine  # noqa: E402
from app.main import app  # noqa: E402


def _make_png_bytes(color=(80, 82, 86)) -> bytes:
    img = Image.new("RGB", (120, 90), color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c
    engine.dispose()
    if TEST_DB.exists():
        TEST_DB.unlink()


def test_health_and_seeded_stats(client: TestClient):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    stats = client.get("/api/stats").json()
    assert stats["total_complaints"] >= 16
    assert stats["resolved_verified"] >= 2
    assert stats["recurring_issues_count"] >= 2

    areas = client.get("/api/areas").json()["areas"]
    assert len(areas) >= 4


def test_anonymous_and_confidential_privacy(client: TestClient):
    png = _make_png_bytes((50, 50, 55))
    res = client.post(
        "/api/complaints",
        data={
            "category": "potholes_road_damage",
            "latitude": "12.9775",
            "longitude": "77.6410",
            "description": "Deep crater near Indiranagar metro pillar",
            "address_hint": "100ft Rd Indiranagar",
            "anonymous": "true",
            "is_confidential": "true",
            "confidential_contact": "secret-phone-9999999999",
        },
        files={"image": ("pothole.png", png, "image/png")},
    )
    assert res.status_code == 201
    created = res.json()
    assert created["anonymous"] is True
    assert created["is_confidential"] is True
    assert "confidential_contact" not in created
    assert "reporter_id" not in created
    assert "internal_remarks" not in created

    detail = client.get(f"/api/complaints/{created['complaint_id']}").json()
    assert "confidential_contact" not in detail
    assert "reporter_id" not in detail
    assert "internal_remarks" not in detail


def test_full_end_to_end_lifecycle_and_recurrence(client: TestClient):
    # 1. Register two citizens
    r1 = client.post(
        "/api/auth/register",
        json={"full_name": "Tester One", "email": "t1@civic.test", "password": "Password@123"},
    )
    assert r1.status_code == 201
    tok1 = r1.json()["access_token"]

    r2 = client.post(
        "/api/auth/register",
        json={"full_name": "Tester Two", "email": "t2@civic.test", "password": "Password@123"},
    )
    assert r2.status_code == 201
    tok2 = r2.json()["access_token"]

    r3 = client.post(
        "/api/auth/register",
        json={"full_name": "Ineligible NonSupporter", "email": "t3@civic.test", "password": "Password@123"},
    )
    assert r3.status_code == 201
    tok3 = r3.json()["access_token"]

    # 2. Citizen 1 submits a pothole complaint in Indiranagar (unique coordinates)
    lat, lng = 12.9799, 77.6442
    png = _make_png_bytes((65, 65, 70))
    create_res = client.post(
        "/api/complaints",
        headers={"Authorization": f"Bearer {tok1}"},
        data={
            "category": "potholes_road_damage",
            "latitude": str(lat),
            "longitude": str(lng),
            "description": "Deep dangerous pothole outside Indiranagar 14th Main",
            "address_hint": "14th Main Indiranagar",
            "anonymous": "false",
        },
        files={"image": ("road_pothole.png", png, "image/png")},
    )
    assert create_res.status_code == 201
    c_data = create_res.json()
    cid = c_data["complaint_id"]
    assert c_data["status"] == "ASSIGNED"
    assert c_data["department_code"] == "ROADS-DEMO"
    assert len(c_data["before_images"]) == 1

    # 3. Duplicate detection finds it 10m away
    dup_res = client.get(
        "/api/complaints/nearby",
        params={"latitude": lat + 0.00005, "longitude": lng + 0.00005, "category": "potholes_road_damage"},
    )
    assert dup_res.status_code == 200
    assert dup_res.json()["duplicate_detected"] is True
    assert any(m["complaint_id"] == cid for m in dup_res.json()["matches"])

    # 4. Citizen 2 supports the complaint; duplicate support blocked
    sup_res = client.post(f"/api/complaints/{cid}/support", headers={"Authorization": f"Bearer {tok2}"})
    assert sup_res.status_code == 200
    assert sup_res.json()["support_count"] == 2
    dup_sup = client.post(f"/api/complaints/{cid}/support", headers={"Authorization": f"Bearer {tok2}"})
    assert dup_sup.status_code == 409

    # 5. Officer cannot support a complaint (403 citizen-only) and wrong-department officer cannot start work (403)
    sanitation_login = client.post(
        "/api/officers/login",
        json={"employee_id": "EMP-DEMO-102", "password": "Officer@123"},
    )
    assert sanitation_login.status_code == 200
    san_tok = sanitation_login.json()["access_token"]
    officer_support = client.post(f"/api/complaints/{cid}/support", headers={"Authorization": f"Bearer {san_tok}"})
    assert officer_support.status_code == 403
    forbidden_start = client.patch(
        f"/api/officers/complaints/{cid}/start",
        headers={"Authorization": f"Bearer {san_tok}"},
        json={"remarks": "Wrong dept"},
    )
    assert forbidden_start.status_code == 403

    # 6. Assigned Road Officer logs in, starts work, and completes with AFTER photo
    road_login = client.post(
        "/api/officers/login",
        json={"employee_id": "EMP-DEMO-101", "password": "Officer@123"},
    )
    assert road_login.status_code == 200
    road_tok = road_login.json()["access_token"]

    start_res = client.patch(
        f"/api/officers/complaints/{cid}/start",
        headers={"Authorization": f"Bearer {road_tok}"},
        json={"remarks": "Crew dispatched", "internal_remarks": "Using hot mix"},
    )
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "IN_PROGRESS"

    after_png = _make_png_bytes((45, 48, 52))
    comp_res = client.post(
        f"/api/officers/complaints/{cid}/complete",
        headers={"Authorization": f"Bearer {road_tok}"},
        data={"remarks": "Asphalt patched and compacted"},
        files={"after_image": ("repaired.png", after_png, "image/png")},
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "AWAITING_VERIFICATION"
    assert len(comp_res.json()["after_images"]) == 1

    # 7. Non-supporter cannot verify (403)
    bad_vote = client.post(
        f"/api/complaints/{cid}/verify",
        headers={"Authorization": f"Bearer {tok3}"},
        json={"vote": "WORK_COMPLETED"},
    )
    assert bad_vote.status_code == 403

    # 8. Two eligible supporters confirm completion -> RESOLVED_VERIFIED
    v1 = client.post(
        f"/api/complaints/{cid}/verify",
        headers={"Authorization": f"Bearer {tok1}"},
        json={"vote": "WORK_COMPLETED"},
    )
    assert v1.status_code == 200
    assert v1.json()["total_votes"] == 1

    # Duplicate vote prevented
    v1_dup = client.post(
        f"/api/complaints/{cid}/verify",
        headers={"Authorization": f"Bearer {tok1}"},
        json={"vote": "WORK_COMPLETED"},
    )
    assert v1_dup.status_code == 409

    v2 = client.post(
        f"/api/complaints/{cid}/verify",
        headers={"Authorization": f"Bearer {tok2}"},
        json={"vote": "WORK_COMPLETED"},
    )
    assert v2.status_code == 200
    assert v2.json()["confirmed_count"] == 2

    detail_after = client.get(f"/api/complaints/{cid}").json()
    assert detail_after["status"] == "RESOLVED_VERIFIED"

    # 9. Civic Issue Memory: new complaint 15m away links to resolved cid!
    rec_res = client.post(
        "/api/complaints",
        headers={"Authorization": f"Bearer {tok1}"},
        data={
            "category": "potholes_road_damage",
            "latitude": str(lat + 0.0001),
            "longitude": str(lng + 0.0001),
            "description": "Pothole reappeared on 14th Main",
            "address_hint": "14th Main Indiranagar",
        },
        files={"image": ("recurring.png", png, "image/png")},
    )
    assert rec_res.status_code == 201
    rec_data = rec_res.json()
    assert rec_data["recurrence"]["is_recurring"] is True
    assert rec_data["recurrence"]["previous_issues"][0]["complaint_id"] == cid

    # 10. Admin analytics accessible only by admin
    citizen_admin = client.get("/api/admin/analytics", headers={"Authorization": f"Bearer {tok1}"})
    assert citizen_admin.status_code == 403

    adm_login = client.post(
        "/api/officers/login",
        json={"email": "admin@civictrack.demo", "password": "Admin@123"},
    )
    assert adm_login.status_code == 200
    adm_tok = adm_login.json()["access_token"]
    adm_analytics = client.get("/api/admin/analytics", headers={"Authorization": f"Bearer {adm_tok}"})
    assert adm_analytics.status_code == 200
    assert adm_analytics.json()["summary"]["total_complaints"] >= 18


def test_disputed_verification_timeline_and_reopen_workflow(client: TestClient):
    # Register 2 citizens and submit a new complaint
    c1 = client.post(
        "/api/auth/register",
        json={"full_name": "Dispute Tester 1", "email": "d1@civic.test", "password": "Password@123"},
    ).json()["access_token"]
    c2 = client.post(
        "/api/auth/register",
        json={"full_name": "Dispute Tester 2", "email": "d2@civic.test", "password": "Password@123"},
    ).json()["access_token"]

    png = _make_png_bytes((70, 70, 70))
    created = client.post(
        "/api/complaints",
        headers={"Authorization": f"Bearer {c1}"},
        data={
            "category": "potholes_road_damage",
            "latitude": "12.9741",
            "longitude": "77.6431",
            "description": "Broken pavement slab near Indiranagar 80ft Rd",
            "address_hint": "80ft Rd Indiranagar",
        },
        files={"image": ("before_slab.png", png, "image/png")},
    )
    assert created.status_code == 201
    cid = created.json()["complaint_id"]

    # Second citizen supports before officer marks work completed
    sup = client.post(f"/api/complaints/{cid}/support", headers={"Authorization": f"Bearer {c2}"})
    assert sup.status_code == 200

    # Officer starts work and uploads after-repair image
    road_tok = client.post(
        "/api/officers/login",
        json={"employee_id": "EMP-DEMO-101", "password": "Officer@123"},
    ).json()["access_token"]

    assert client.patch(f"/api/officers/complaints/{cid}/start", headers={"Authorization": f"Bearer {road_tok}"}).status_code == 200
    comp = client.post(
        f"/api/officers/complaints/{cid}/complete",
        headers={"Authorization": f"Bearer {road_tok}"},
        data={"remarks": "Patched pavement"},
        files={"after_image": ("after_slab.png", png, "image/png")},
    )
    assert comp.status_code == 200
    assert comp.json()["status"] == "AWAITING_VERIFICATION"
    assert comp.json()["completion_requested_at"] is not None
    assert comp.json()["completed_by"]["employee_id"] == "EMP-DEMO-101"

    # First citizen disputes (1 vote < 2 min -> stays AWAITING_VERIFICATION, timeline updated)
    v1 = client.post(
        f"/api/complaints/{cid}/verify",
        headers={"Authorization": f"Bearer {c1}"},
        json={"vote": "ISSUE_STILL_EXISTS"},
    )
    assert v1.status_code == 200
    assert v1.json()["disputed_count"] == 1
    d_mid = client.get(f"/api/complaints/{cid}").json()
    assert d_mid["status"] == "AWAITING_VERIFICATION"
    assert any("Citizen verification vote recorded" in (t["remarks"] or "") for t in d_mid["timeline"])

    # Second citizen also disputes -> status becomes DISPUTED
    v2 = client.post(
        f"/api/complaints/{cid}/verify",
        headers={"Authorization": f"Bearer {c2}"},
        json={"vote": "ISSUE_STILL_EXISTS"},
    )
    assert v2.status_code == 200
    assert v2.json()["disputed_count"] == 2
    d_disp = client.get(f"/api/complaints/{cid}").json()
    assert d_disp["status"] == "DISPUTED"

    # Officer reopens disputed complaint -> status becomes REOPENED
    reopen = client.post(
        f"/api/officers/complaints/{cid}/reopen",
        headers={"Authorization": f"Bearer {road_tok}"},
        json={"remarks": "Reopening for full slab replacement."},
    )
    assert reopen.status_code == 200
    assert reopen.json()["status"] == "REOPENED"
