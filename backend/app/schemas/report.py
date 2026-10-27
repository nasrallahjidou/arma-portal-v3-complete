from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date

class ReportBase(BaseModel):
    station_id: int
    intervention_date: datetime
    zone: str = Field(..., min_length=1, max_length=100)
    agent_name: str = Field(..., min_length=1, max_length=255)
    observations: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ReportCreate(ReportBase):
    photo_before: Optional[str] = None
    photo_after: Optional[str] = None

class ReportUpdate(BaseModel):
    intervention_date: Optional[datetime] = None
    zone: Optional[str] = Field(None, min_length=1, max_length=100)
    agent_name: Optional[str] = Field(None, min_length=1, max_length=255)
    observations: Optional[str] = None
    photo_before: Optional[str] = None
    photo_after: Optional[str] = None
    status: Optional[str] = None

class ReportResponse(ReportBase):
    id: int
    created_by: int
    photo_before: Optional[str] = None
    photo_after: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Nested data
    station_code: Optional[str] = None
    station_city: Optional[str] = None

    class Config:
        from_attributes = True

class ReportList(BaseModel):
    items: List[ReportResponse]
    total: int

class ReportFilter(BaseModel):
    station_id: Optional[int] = None
    station_code: Optional[str] = None
    city: Optional[str] = None
    zone: Optional[str] = None
    agent_name: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    status: Optional[str] = None
