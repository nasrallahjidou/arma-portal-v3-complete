from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date

class PDFRequest(BaseModel):
    station_id: Optional[int] = None
    station_code: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    zone: Optional[str] = None
    include_photos: bool = True
    language: str = "fr"  # fr, ar, en

class PDFResponse(BaseModel):
    filename: str
    content_type: str = "application/pdf"
    file_size: Optional[int] = None
    download_url: Optional[str] = None

class DashboardStats(BaseModel):
    total_reports: int
    total_stations: int
    total_zones: int
    total_agents: int
    reports_this_month: int
    reports_by_city: List[dict]
    reports_by_zone: List[dict]
    top_agents: List[dict]
    monthly_trend: List[dict]
