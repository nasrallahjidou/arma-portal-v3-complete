from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import Optional
from datetime import date
from datetime import datetime

from io import BytesIO

from app.core.database import get_db
from app.core.security import get_current_user, require_admin, require_all
from app.models.user import User
from app.models.station import Station
from app.models.report import Report
from app.schemas.pdf import PDFRequest, PDFResponse
from app.services.pdf_generator import generate_station_pdf

router = APIRouter(prefix="/pdf", tags=["PDF Generation"])

@router.post("/generate")
async def generate_pdf(
    request: PDFRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_all)
):
    """Generate PDF report for a station"""

    # Build query based on filters
    query = select(Report).join(Station).where(Report.status == "completed")

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

    # Apply station filter
    if request.station_id:
        query = query.where(Report.station_id == request.station_id)
    if request.station_code:
        query = query.where(Station.code == request.station_code)

    # Apply date range
    if request.date_from:
        query = query.where(func.date(Report.intervention_date) >= request.date_from)
    if request.date_to:
        query = query.where(func.date(Report.intervention_date) <= request.date_to)

    # Apply zone filter
    if request.zone:
        query = query.where(Report.zone == request.zone)

    # Order by date
    query = query.order_by(Report.intervention_date.desc())

    result = await db.execute(query)
    reports = result.scalars().all()

    if not reports:
        raise HTTPException(
            status_code=404,
            detail="Aucun rapport trouvé pour les critères sélectionnés"
        )

        # Get station info from first report
    first_report = reports[0]
    
    # Fetch station with await
    station_result = await db.execute(select(Station).where(Station.id == first_report.station_id))
    station = station_result.scalar_one_or_none()
    # Prepare data for PDF
    station_data = {
        "code": station.code if station else (request.station_code or "N/A"),
        "ville": station.city if station else "N/A",
        "name": station.name if station else "N/A",
        "client_name": current_user.full_name or current_user.email,
        "periode": f"{request.date_from.strftime('%d/%m/%Y') if request.date_from else 'Début'} — {request.date_to.strftime('%d/%m/%Y') if request.date_to else 'Aujourd\'hui'}",
        "generated_by": current_user.full_name or current_user.email,
        "generated_at": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "total_interventions": len(reports),
        "language": request.language
    }

    # Convert reports to DataFrame-like structure
    reports_data = []
    for report in reports:
        reports_data.append({
            "Date de l'intervention": report.intervention_date.strftime("%d/%m/%Y"),
            "Zone de nettoyage": report.zone,
            "Nom de responsable/Agent": report.agent_name,
            "Photo AVANT": report.photo_before or "",
            "Photo APRES": report.photo_after or "",
            "Observations": report.observations or "",
            "Ville": station.city if station else "",
            "Le Code de la station": station.code if station else ""
        })

    # Generate PDF
    try:
        pdf_bytes = generate_station_pdf(station_data, reports_data, include_photos=request.include_photos)

        from fastapi.responses import StreamingResponse

        filename = f"ARMA_Rapport_{station_data['code']}_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"

        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la génération du PDF: {str(e)}"
        )

@router.get("/preview")
async def preview_pdf_data(
    station_id: Optional[int] = Query(None),
    station_code: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_all)
):
    """Preview data before PDF generation"""
    query = select(Report).join(Station).where(Report.status == "completed")

    if current_user.role == "client" and current_user.client_code:
        query = query.where(Station.code == current_user.client_code)
    elif current_user.role == "employer" and current_user.assigned_stations:
        if current_user.assigned_stations != ["ALL"]:
            query = query.where(Station.city.in_(current_user.assigned_stations))

    if station_id:
        query = query.where(Report.station_id == station_id)
    if station_code:
        query = query.where(Station.code == station_code)
    if date_from:
        query = query.where(func.date(Report.intervention_date) >= date_from)
    if date_to:
        query = query.where(func.date(Report.intervention_date) <= date_to)

    result = await db.execute(query)
    reports = result.scalars().all()

    # Group by zone for preview
    zones = {}
    for report in reports:
        zone = report.zone
        if zone not in zones:
            zones[zone] = []
        zones[zone].append({
            "date": report.intervention_date.strftime("%d/%m/%Y"),
            "agent": report.agent_name,
            "has_photos": bool(report.photo_before or report.photo_after),
            "observations": report.observations
        })

    return {
        "total_interventions": len(reports),
        "zones_count": len(zones),
        "zones": zones,
        "date_range": {
            "from": date_from.isoformat() if date_from else None,
            "to": date_to.isoformat() if date_to else None
        }
    }
