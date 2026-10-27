from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.security import get_current_user, require_admin, require_admin_or_employer
from app.models.user import User
from app.models.station import Station
from app.models.report import Report
from app.schemas.pdf import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_employer)
):
    """Get dashboard statistics"""

    # Base query with role filtering
    base_query = select(Report).join(Station)

    if current_user.role == "employer":
        if current_user.assigned_stations and current_user.assigned_stations != ["ALL"]:
            base_query = base_query.where(Station.city.in_(current_user.assigned_stations))

    # Total reports
    result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total_reports = result.scalar() or 0

    # Total stations
    station_query = select(Station)
    if current_user.role == "employer" and current_user.assigned_stations:
        if current_user.assigned_stations != ["ALL"]:
            station_query = station_query.where(Station.city.in_(current_user.assigned_stations))

    result = await db.execute(select(func.count()).select_from(station_query.subquery()))
    total_stations = result.scalar() or 0

    # Total zones (unique)
    result = await db.execute(
        select(func.count(func.distinct(Report.zone))).select_from(base_query.subquery())
    )
    total_zones = result.scalar() or 0

    # Total agents (unique)
    result = await db.execute(
        select(func.count(func.distinct(Report.agent_name))).select_from(base_query.subquery())
    )
    total_agents = result.scalar() or 0

    # Reports this month
    now = datetime.utcnow()
    first_day = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    monthly_query = base_query.where(Report.intervention_date >= first_day)
    result = await db.execute(select(func.count()).select_from(monthly_query.subquery()))
    reports_this_month = result.scalar() or 0

    # Reports by city
    result = await db.execute(
        select(Station.city, func.count(Report.id))
        .join(Report, Station.id == Report.station_id)
        .group_by(Station.city)
        .order_by(func.count(Report.id).desc())
    )
    reports_by_city = [{"city": row[0], "count": row[1]} for row in result.all()]

    # Reports by zone
    result = await db.execute(
        select(Report.zone, func.count(Report.id))
        .group_by(Report.zone)
        .order_by(func.count(Report.id).desc())
    )
    reports_by_zone = [{"zone": row[0], "count": row[1]} for row in result.all()]

    # Top agents
    result = await db.execute(
        select(Report.agent_name, func.count(Report.id))
        .group_by(Report.agent_name)
        .order_by(func.count(Report.id).desc())
        .limit(10)
    )
    top_agents = [{"agent": row[0], "interventions": row[1]} for row in result.all()]

    # Monthly trend (last 6 months)
    months = []
    for i in range(5, -1, -1):
        month_date = now - timedelta(days=i*30)
        month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_end = (month_start + timedelta(days=32)).replace(day=1)

        result = await db.execute(
            select(func.count(Report.id))
            .select_from(Report)
            .where(Report.intervention_date >= month_start)
            .where(Report.intervention_date < month_end)
        )
        count = result.scalar() or 0
        months.append({
            "month": month_start.strftime("%b %Y"),
            "count": count
        })

    return DashboardStats(
        total_reports=total_reports,
        total_stations=total_stations,
        total_zones=total_zones,
        total_agents=total_agents,
        reports_this_month=reports_this_month,
        reports_by_city=reports_by_city,
        reports_by_zone=reports_by_zone,
        top_agents=top_agents,
        monthly_trend=months
    )

@router.get("/recent-reports")
async def get_recent_reports(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_employer)
):
    """Get recent reports for dashboard"""
    query = select(Report).join(Station).order_by(Report.created_at.desc()).limit(limit).options(selectinload(Report.station))

    if current_user.role == "employer":
        if current_user.assigned_stations and current_user.assigned_stations != ["ALL"]:
            query = query.where(Station.city.in_(current_user.assigned_stations))

    result = await db.execute(query)
    reports = result.scalars().all()

    return [
        {
            "id": r.id,
            "station_code": r.station.code if r.station else None,
            "station_city": r.station.city if r.station else None,
            "zone": r.zone,
            "agent_name": r.agent_name,
            "intervention_date": r.intervention_date.isoformat(),
            "has_photos": bool(r.photo_before or r.photo_after),
            "status": r.status
        }
        for r in reports
    ]

@router.get("/client-stats")
async def get_client_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get stats for client dashboard"""
    if current_user.role != "client":
        raise HTTPException(status_code=403, detail="Accès réservé aux clients")

    if not current_user.client_code:
        raise HTTPException(status_code=400, detail="Code client non défini")

    # Get reports for client's station WITH PHOTOS
    result = await db.execute(
        select(Report)
        .join(Station)
        .where(Station.code == current_user.client_code)
        .order_by(Report.intervention_date.desc())
        .options(selectinload(Report.station))
    )
    reports = result.scalars().all()

    # Calculate stats
    total = len(reports)
    zones = list(set(r.zone for r in reports if r.zone))

    # Last intervention
    last_report = reports[0] if reports else None

    # This month count
    now = datetime.utcnow()
    first_day = now.replace(day=1)
    this_month = len([r for r in reports if r.intervention_date and r.intervention_date >= first_day])

    # ✅ NEW: Build recent_reports with PHOTOS
    recent_reports = []
    for r in reports[:10]:  # Last 10 reports
        recent_reports.append({
            "id": r.id,
            "zone": r.zone,
            "intervention_date": r.intervention_date.isoformat() if r.intervention_date else (r.created_at.isoformat() if r.created_at else None),
            "station_code": r.station.code if r.station else current_user.client_code,
            "station_name": r.station.name if r.station else None,
            "photo_before": r.photo_before,  # ✅ PHOTO!
            "photo_after": r.photo_after,      # ✅ PHOTO!
            "status": r.status or "completed",
            "pdf_url": r.pdf_url,
            "agent_name": r.agent_name
        })

    return {
        "station_code": current_user.client_code,
        "total_interventions": total,
        "zones_cleaned": len(zones),
        "zones_list": zones,
        "this_month": this_month,
        "last_intervention": last_report.intervention_date.isoformat() if last_report and last_report.intervention_date else None,
        "last_zone": last_report.zone if last_report else None,
        "recent_reports": recent_reports  # ✅ NEW!
    }