import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _get_env(key: str, default: str = "") -> str:
    return os.environ.get(key, default).strip()


def _get_database_url() -> str:
    raw = _get_env("DATABASE_URL")
    if raw.startswith("postgres://"):
        return "postgresql://" + raw[len("postgres://"):]
    return raw or f"sqlite:///{(BASE_DIR / 'civictrack_demo.db').as_posix()}"


class Settings:
    PROJECT_NAME: str = "CivicTrack API"
    VERSION: str = "1.0.0"

    # Database: PostgreSQL/Supabase URL or local SQLite fallback
    DATABASE_URL: str = _get_database_url()

    # Security
    SECRET_KEY: str = _get_env("SECRET_KEY") or "civictrack-dev-secret-key-change-in-production-2026"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(_get_env("ACCESS_TOKEN_EXPIRE_MINUTES") or "720")

    # CORS
    CORS_ORIGINS: list[str] = [
        o.strip()
        for o in (_get_env("CORS_ORIGINS") or "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173").split(",")
        if o.strip()
    ]

    # Optional Supabase Storage
    SUPABASE_URL: str = _get_env("SUPABASE_URL")
    SUPABASE_SERVICE_KEY: str = _get_env("SUPABASE_SERVICE_KEY")
    SUPABASE_STORAGE_BUCKET: str = _get_env("SUPABASE_STORAGE_BUCKET") or "civictrack-images"

    # Optional Vision AI API
    VISION_AI_PROVIDER: str = _get_env("VISION_AI_PROVIDER") or "fallback"
    OPENAI_API_KEY: str = _get_env("OPENAI_API_KEY")
    GEMINI_API_KEY: str = _get_env("GEMINI_API_KEY")

    # Configurable Rules & Thresholds
    DUPLICATE_RADIUS_METERS: float = float(_get_env("DUPLICATE_RADIUS_METERS") or "75")
    RECURRENCE_RADIUS_METERS: float = float(_get_env("RECURRENCE_RADIUS_METERS") or "85")
    VERIFICATION_MIN_VOTES: int = int(_get_env("VERIFICATION_MIN_VOTES") or "2")
    VERIFICATION_PASS_RATIO: float = float(_get_env("VERIFICATION_PASS_RATIO") or "0.5")
    DEFAULT_SLA_HOURS: int = int(_get_env("DEFAULT_SLA_HOURS") or "72")

    # Upload Restrictions
    MAX_UPLOAD_BYTES: int = 5 * 1024 * 1024  # 5 MB
    ALLOWED_IMAGE_EXTENSIONS: set[str] = {".jpg", ".jpeg", ".png", ".webp"}


settings = Settings()
