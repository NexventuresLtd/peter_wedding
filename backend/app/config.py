from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    database_url: str = (
        "postgresql+psycopg://postgres:postgres@localhost:5432/peterwedding"
    )

    secret_key: str = "insecure-dev-key-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 720

    first_admin_email: str = "admin@peterwedding.rw"
    first_admin_password: str = "ChangeMe123!"
    first_admin_name: str = "Wedding Admin"

    # Blank means "derive from the incoming request" — see public_base_url().
    public_site_url: str = ""
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Path every endpoint and the media mount live under. Set this to whatever
    # your reverse proxy forwards to the backend *without stripping* — e.g.
    # "/api/v1" when the API is published at https://example.com/api/v1/.
    # The frontend's VITE_API_BASE_URL must end with the same path.
    api_prefix: str = "/api"

    upload_dir: str = "uploads"
    max_image_mb: int = 15
    max_video_mb: int = 200

    @property
    def normalised_api_prefix(self) -> str:
        """Leading slash, no trailing slash. "" means mount at the root."""
        prefix = "/" + self.api_prefix.strip().strip("/")
        return "" if prefix == "/" else prefix

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def upload_path(self) -> Path:
        path = Path(self.upload_dir)
        if not path.is_absolute():
            path = BASE_DIR / path
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
