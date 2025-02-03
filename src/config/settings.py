"""Configuration management for the GitHub Multi-Agent System."""

import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Settings:
    """Settings class to manage configuration."""
    
    # GitHub Configuration
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    GITHUB_REPOSITORY: str = os.getenv("GITHUB_REPOSITORY", "")
    GITHUB_WEBHOOK_SECRET: str = os.getenv("GITHUB_WEBHOOK_SECRET", "")
    GITHUB_API_URL: str = os.getenv("GITHUB_API_URL", "https://api.github.com")
    GITHUB_ORGANIZATION: str = os.getenv("GITHUB_ORGANIZATION", "")
    
    # OpenAI Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "o3-mini-2025-01-31")
    TEMPERATURE: float = float(os.getenv("TEMPERATURE", "0.7"))
    
    # Redis Configuration
    REDIS_ENABLED: bool = os.getenv("REDIS_ENABLED", "false").lower() == "true"
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_PASSWORD: Optional[str] = os.getenv("REDIS_PASSWORD")
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    REDIS_SSL: bool = os.getenv("REDIS_SSL", "false").lower() == "true"
    
    @property
    def REDIS_URL(self) -> str:
        """Construct Redis URL from components."""
        auth = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        protocol = "rediss" if self.REDIS_SSL else "redis"
        return f"{protocol}://{auth}{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    # Documentation Configuration
    DOCS_BASE_PATH: str = os.getenv("DOCS_BASE_PATH", "docs")
    TEMPLATE_PATH: str = os.getenv("TEMPLATE_PATH", "src/templates/files")
    DOC_BRANCH_PREFIX: str = os.getenv("DOC_BRANCH_PREFIX", "docs/")
    DOC_PR_LABELS: str = os.getenv("DOC_PR_LABELS", "documentation,automated")
    
    # Server Configuration
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    WORKERS: int = int(os.getenv("WORKERS", "1"))
    
    @classmethod
    def validate(cls) -> bool:
        """Validate required settings are set."""
        if not cls.GITHUB_TOKEN:
            raise ValueError("GITHUB_TOKEN must be set")
        if not cls.GITHUB_REPOSITORY:
            raise ValueError("GITHUB_REPOSITORY must be set")
        if not cls.GITHUB_WEBHOOK_SECRET:
            raise ValueError("GITHUB_WEBHOOK_SECRET must be set")
        if not cls.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY must be set")
        return True

# Create settings instance
settings = Settings() 