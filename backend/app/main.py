from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os

from app.core.config import get_settings
from app.core.database import init_db
from app.routers import auth, users, stations, reports, pdf, dashboard

settings = get_settings()

app = FastAPI(
    title="ARMA Digital Portal API",
    description="API professionnelle pour la gestion des rapports de nettoyage ARMA Environnement",
    version="3.0.0",
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(stations.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(pdf.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")

@app.on_event("startup")
async def startup_event():
    await init_db()

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "3.0.0", "environment": settings.ENVIRONMENT}

@app.get("/")
async def root():
    return {
        "message": "ARMA Digital Portal API v3.0",
        "docs": "/api/docs",
        "health": "/api/health"
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Erreur interne du serveur", "message": str(exc)}
    )
