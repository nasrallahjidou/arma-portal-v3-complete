from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date, datetime
import os
import uuid
import shutil

from app.core.database import get_db
from app.core.config import get_settings
from app.core.security import get_current_user, require_admin, require_admin_or_employer, require_all
from app.models.user import User
from app.models.station import Station
from app.models.report import Report
from app.schemas.report import ReportCreate, ReportUpdate, ReportResponse, ReportFilter, ReportList

settings = get_settings()
router = APIRouter(prefix="/reports", tags=["Reports"])

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@router.get("", response_model=List[ReportResponse])
async def list_reports(
    station_id: Optional[int] = Query(None),
    station_code: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    zone: Optional[str] = Query(None),
    agent_name: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List reports with role-based filtering"""
    query = select(Report).join(Station)

    # Role-based filtering
    if current_user.role == "client":
        if current_user.client_code:
            query = query.where(Station.code == current_user.client_code)
    elif current_user.role == "employer":
        if current_user.assigned_stations and current_user.assigned_stations != ["ALL"]:
            query = query.where(
                Station.name.in_(current_user.assigned_stations) |
                Station.code.in_(current_user.assigned_stations)
        )
    # Admin sees all

    # Apply filters
    if station_id:
        query = query.where(Report.station_id == station_id)
    if station_code:
        query = query.where(Station.code == station_code)
    if city:
        query = query.where(Station.city == city)
    if zone:
        query = query.where(Report.zone == zone)
    if agent_name:
        query = query.where(Report.agent_name.ilike(f"%{agent_name}%"))
    if date_from:
        query = query.where(func.date(Report.intervention_date) >= date_from)
    if date_to:
        query = query.where(func.date(Report.intervention_date) <= date_to)
    if status:
        query = query.where(Report.status == status)

    query = query.order_by(Report.intervention_date.desc()).offset(skip).limit(limit).options(selectinload(Report.station))
    result = await db.execute(query)
    reports = result.scalars().all()

    # Enrich with station data
    report_list = []
    for report in reports:
        report_dict = {
            "id": report.id,
            "station_id": report.station_id,
            "intervention_date": report.intervention_date,
            "zone": report.zone,
            "agent_name": report.agent_name,
            "observations": report.observations,
            "latitude": report.latitude,
            "longitude": report.longitude,
            "created_by": report.created_by,
            "photo_before": report.photo_before,
            "photo_after": report.photo_after,
            "status": report.status,
            "created_at": report.created_at,
            "updated_at": report.updated_at,
            "station_code": report.station.code if report.station else None,
            "station_city": report.station.city if report.station else None,
        }
        report_list.append(report_dict)

    return report_list

@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    report_data: ReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_employer)
):
    """Create new report - Employer/Admin only"""
    # Verify station exists and user has access
    result = await db.execute(select(Station).where(Station.id == report_data.station_id))
    station = result.scalar_one_or_none()
    if not station:
        raise HTTPException(status_code=404, detail="Station non trouvée")

        # Check employer access by station name or code
    if current_user.role == "employer":
        if current_user.assigned_stations and current_user.assigned_stations != ["ALL"]:
            if station.name not in current_user.assigned_stations and station.code not in current_user.assigned_stations:
                raise HTTPException(
                    status_code=403,
                    detail=f"Accès refusé. Vous n'êtes pas assigné à cette station"
                )

    new_report = Report(
        station_id=report_data.station_id,
        created_by=current_user.id,
        intervention_date=report_data.intervention_date,
        zone=report_data.zone,
        agent_name=report_data.agent_name,
        observations=report_data.observations,
        photo_before=report_data.photo_before,
        photo_after=report_data.photo_after,
        latitude=report_data.latitude,
        longitude=report_data.longitude,
        status="completed"
    )

    db.add(new_report)
    await db.flush()
    await db.refresh(new_report)

    return {
        "id": new_report.id,
        "station_id": new_report.station_id,
        "intervention_date": new_report.intervention_date,
        "zone": new_report.zone,
        "agent_name": new_report.agent_name,
        "observations": new_report.observations,
        "latitude": new_report.latitude,
        "longitude": new_report.longitude,
        "created_by": new_report.created_by,
        "photo_before": new_report.photo_before,
        "photo_after": new_report.photo_after,
        "status": new_report.status,
        "created_at": new_report.created_at,
        "updated_at": new_report.updated_at,
        "station_code": station.code,
        "station_city": station.city,
    }

@router.post("/upload-photo")
async def upload_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin_or_employer)
):
    """Upload photo and return URL"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Type de fichier non supporté. Types acceptés: {', '.join(allowed_types)}"
        )

    # Generate unique filename
    ext = file.filename.split(".")[-1].lower()
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    # Save file
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Return URL (in production, this would be a CDN URL)
    file_url = f"/uploads/{filename}"
    return {"filename": filename, "url": file_url, "content_type": file.content_type}

@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get report by ID"""
    result = await db.execute(
        select(Report).where(Report.id == report_id).join(Station).options(selectinload(Report.station))
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")

    # Check access
    if current_user.role == "client" and current_user.client_code != report.station.code:
        raise HTTPException(status_code=403, detail="Accès refusé")

    return {
        "id": report.id,
        "station_id": report.station_id,
        "intervention_date": report.intervention_date,
        "zone": report.zone,
        "agent_name": report.agent_name,
        "observations": report.observations,
        "latitude": report.latitude,
        "longitude": report.longitude,
        "created_by": report.created_by,
        "photo_before": report.photo_before,
        "photo_after": report.photo_after,
        "status": report.status,
        "created_at": report.created_at,
        "updated_at": report.updated_at,
        "station_code": report.station.code if report.station else None,
        "station_city": report.station.city if report.station else None,
    }

@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: int,
    report_data: ReportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_employer)
):
    """Update report - Creator or Admin only"""
    result = await db.execute(select(Report).where(Report.id == report_id).options(selectinload(Report.station)))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")

    # Only creator or admin can update
    if current_user.role != "admin" and report.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez modifier que vos propres rapports")

    update_data = report_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(report, field, value)

    await db.flush()
    await db.refresh(report)

    return {
        "id": report.id,
        "station_id": report.station_id,
        "intervention_date": report.intervention_date,
        "zone": report.zone,
        "agent_name": report.agent_name,
        "observations": report.observations,
        "latitude": report.latitude,
        "longitude": report.longitude,
        "created_by": report.created_by,
        "photo_before": report.photo_before,
        "photo_after": report.photo_after,
        "status": report.status,
        "created_at": report.created_at,
        "updated_at": report.updated_at,
        "station_code": report.station.code if report.station else None,
        "station_city": report.station.city if report.station else None,
    }

@router.delete("/{report_id}")
async def delete_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete report - Admin only"""
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")

    await db.delete(report)
    return {"message": f"Rapport #{report_id} supprimé avec succès"}