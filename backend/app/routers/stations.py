from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user, require_admin, require_admin_or_employer
from app.models.user import User
from app.models.station import Station
from app.schemas.station import StationCreate, StationUpdate, StationResponse, StationList

router = APIRouter(prefix="/stations", tags=["Stations"])

@router.get("", response_model=List[StationResponse])
async def list_stations(
    city: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List stations based on user role"""
    query = select(Station)

        # Role-based filtering
    if current_user.role == "client":
        # Client sees only their station
        if current_user.client_code:
            query = query.where(Station.code == current_user.client_code)
    elif current_user.role == "employer":
        # Employer sees stations by name or code
        if current_user.assigned_stations and current_user.assigned_stations != ["ALL"]:
            query = query.where(
                Station.name.in_(current_user.assigned_stations) | 
                Station.code.in_(current_user.assigned_stations)
            )
    
    # Admin sees all

    if city:
        query = query.where(Station.city == city)
    if is_active is not None:
        query = query.where(Station.is_active == is_active)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    stations = result.scalars().all()
    return stations

@router.post("", response_model=StationResponse, status_code=status.HTTP_201_CREATED)
async def create_station(
    station_data: StationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create new station - Admin only"""
    # Check if code exists
    result = await db.execute(select(Station).where(Station.code == station_data.code))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Code station '{station_data.code}' déjà utilisé"
        )

    new_station = Station(**station_data.model_dump())
    db.add(new_station)
    await db.flush()
    await db.refresh(new_station)
    return new_station

@router.get("/{station_id}", response_model=StationResponse)
async def get_station(
    station_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get station by ID"""
    result = await db.execute(select(Station).where(Station.id == station_id))
    station = result.scalar_one_or_none()
    if not station:
        raise HTTPException(status_code=404, detail="Station non trouvée")

    # Check access
    if current_user.role == "client" and current_user.client_code != station.code:
        raise HTTPException(status_code=403, detail="Accès refusé")

    return station

@router.put("/{station_id}", response_model=StationResponse)
async def update_station(
    station_id: int,
    station_data: StationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update station - Admin only"""
    result = await db.execute(select(Station).where(Station.id == station_id))
    station = result.scalar_one_or_none()
    if not station:
        raise HTTPException(status_code=404, detail="Station non trouvée")

    update_data = station_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(station, field, value)

    await db.flush()
    await db.refresh(station)
    return station

@router.delete("/{station_id}")
async def delete_station(
    station_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete station - Admin only"""
    result = await db.execute(select(Station).where(Station.id == station_id))
    station = result.scalar_one_or_none()
    if not station:
        raise HTTPException(status_code=404, detail="Station non trouvée")

    await db.delete(station)
    return {"message": f"Station {station.code} supprimée avec succès"}

@router.get("/stats/by-city")
async def get_stations_by_city(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_employer)
):
    """Get station counts by city"""
    result = await db.execute(
        select(Station.city, func.count(Station.id)).group_by(Station.city)
    )
    return [{"city": row[0], "count": row[1]} for row in result.all()]
