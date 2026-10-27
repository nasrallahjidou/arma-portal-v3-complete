from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Database
    #DATABASE_URL: str = "postgresql+asyncpg://ARMA_user:ARMA_password@db:5432/ARMA_db"
    DATABASE_URL: str = "sqlite+aiosqlite:///./ARMA_portal.db"
    # Security
    SECRET_KEY: str = "change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 10485760  # 10MB

    # Company
    COMPANY_NAME: str = "ARMA Environnement"
    COMPANY_LOGO_URL: str = ""

    # Environment
    ENVIRONMENT: str = "production"
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
