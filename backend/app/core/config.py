import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    ENV: str = os.getenv("FLASK_ENV", "development")
    DEBUG: bool = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")

    # Comma-separated list of allowed origins for CORS
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:5173"
    ).split(",")

    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://solvann:solvann@localhost:5432/solvann"
    )
    # Background job that samples plant data into DATABASE_URL every 60s for history/aggregates
    ENABLE_HISTORY_COLLECTOR: bool = (
        os.getenv("ENABLE_HISTORY_COLLECTOR", "true").lower() == "true"
    )


settings = Settings()
