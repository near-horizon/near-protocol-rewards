"""Main application module for Orc-Agent."""

import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import make_asgi_app

from src.config.settings import Settings
from src.events.processor import EventProcessor
from src.events.queue import EventQueue
from src.services.github_service import GitHubService
from src.webhook.routes import router as webhook_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load settings
settings = Settings()

# Create FastAPI application
app = FastAPI(
    title="Orc-Agent",
    description="Automated documentation generation system",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Prometheus metrics
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# Include routers
app.include_router(webhook_router, prefix="/webhook", tags=["webhook"])

# Initialize services
github_service = GitHubService()
event_queue = EventQueue()
event_processor = EventProcessor()

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    try:
        # Start event processor
        await event_processor.start()
        logger.info("Application started successfully")
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    try:
        # Stop event processor
        await event_processor.stop()
        logger.info("Application shutdown complete")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

@app.get("/health")
async def health_check():
    """Check application health status."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": "2024-02-02T12:00:00Z"
    }

@app.get("/health/redis")
async def redis_health():
    """Check Redis connection status."""
    try:
        queue_length = await event_queue.get_queue_length()
        processing_count = await event_queue.get_processing_count()
        return {
            "status": "connected",
            "queue_length": queue_length,
            "processing_count": processing_count
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "disconnected",
                "error": str(e)
            }
        )

@app.get("/health/github")
async def github_health():
    """Check GitHub API status."""
    try:
        rate_limit = await github_service.get_rate_limit()
        return {
            "status": "operational",
            "rate_limit": rate_limit
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "error": str(e)
            }
        )

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add processing time to response headers."""
    import time
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response 