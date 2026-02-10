"""
CivicPulse Configuration
Environment-based configuration for demo and production modes.
"""

import os
from functools import lru_cache

class Settings:
    """Application settings loaded from environment variables."""
    
    # Demo mode - enables OTP bypass, seed data, and other demo features
    DEMO_MODE: bool = True
    print(f"DEBUG: DEMO_MODE is force-set to {DEMO_MODE}")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./civicpulse.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-jwt-secret-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    
    # OCR
    OCR_LANG: str = os.getenv("OCR_LANG", "eng+hin")
    
    # Kiosk
    DEFAULT_KIOSK_ID: str = os.getenv("DEFAULT_KIOSK_ID", "kiosk-001")
    
    # Demo OTP bypass code
    DEMO_OTP_BYPASS: str = "000000"
    
    # Admin password (demo only)
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "admin123")


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()

# Log demo mode status on import
if settings.DEMO_MODE:
    print("\n" + "=" * 60)
    print("🎪 DEMO MODE ENABLED")
    print("   - OTP bypass code: 000000")
    print("   - Seed endpoint available: POST /admin/seed-demo")
    print("   - Admin password: admin123")
    print("=" * 60 + "\n")
