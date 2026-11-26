import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .config import UPLOADS_DIR, settings
from .database import Base, SessionLocal, engine
from .models import ComplaintImage
from .routers import admin_router, auth_router, complaints_router, officer_router, system_router
from .seed import seed_database_if_empty
from .services.escalation import run_escalation_sweep


def _upgrade_legacy_demo_images(db):
    legacy_map = {
        "/api/uploads/demo_pothole_before.png": "/api/uploads/demo_pothole_2.jpg",
        "/api/uploads/demo_pothole_after.png": "/api/uploads/demo_road_repair_1.jpg",
        "/api/uploads/demo_garbage_before.png": "/api/uploads/demo_garbage_1.jpg",
        "/api/uploads/demo_garbage_after.png": "/api/uploads/demo_garbage_after_2.jpg",
        "/api/uploads/demo_drain_before.png": "/api/uploads/demo_drain_1.jpg",
        "/api/uploads/demo_drain_after.png": "/api/uploads/demo_drain_after_1.jpg",
    }
    rows = db.query(ComplaintImage).filter(ComplaintImage.image_url.in_(legacy_map.keys())).all()
    if rows:
        for r in rows:
            r.image_url = legacy_map[r.image_url]
        db.commit()


async def _periodic_escalation_worker():
    while True:
        try:
            db = SessionLocal()
            try:
                run_escalation_sweep(db)
            finally:
                db.close()
        except Exception:
            pass
        await asyncio.sleep(300)  # Run SLA escalation sweep every 5 minutes


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database_if_empty(db)
        _upgrade_legacy_demo_images(db)
        run_escalation_sweep(db)
    finally:
        db.close()

    task = asyncio.create_task(_periodic_escalation_worker())
    try:
        yield
    finally:
        task.cancel()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "CivicTrack REST API — Independent AI-assisted civic infrastructure complaint management, "
        "smart duplicate detection, explainable prioritization, before-and-after repair evidence, "
        "community verification, and Civic Issue Memory."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(system_router.router)
app.include_router(complaints_router.router)
app.include_router(officer_router.router)
app.include_router(admin_router.router)


@app.get("/api/health", tags=["System, AI & Public Reference"])
def health_check():
    return {
        "status": "healthy",
        "service": "CivicTrack Backend",
        "database_mode": "sqlite_demo" if settings.DATABASE_URL.startswith("sqlite") else "postgresql",
        "ai_mode": settings.VISION_AI_PROVIDER if (settings.GEMINI_API_KEY or settings.OPENAI_API_KEY) else "heuristic_fallback",
        "storage_mode": "supabase" if (settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY) else "local_uploads",
    }


@app.get("/api/uploads/{filename}", tags=["System, AI & Public Reference"])
def serve_uploaded_image(filename: str):
    safe_name = Path(filename).name
    target = (UPLOADS_DIR / safe_name).resolve()
    if not str(target).startswith(str(UPLOADS_DIR.resolve())) or not target.exists():
        raise HTTPException(status_code=404, detail="Image not found.")
    return FileResponse(target)
