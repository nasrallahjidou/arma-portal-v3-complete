from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class StationBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=255)
    city: str = Field(..., min_length=1, max_length=100)
    address: Optional[str] = None
    zones: Optional[List[str]] = []
    is_active: bool = True

class StationCreate(StationBase):
    client_id: Optional[int] = None

class StationUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    city: Optional[str] = Field(None, min_length=1, max_length=100)
    address: Optional[str] = None
    zones: Optional[List[str]] = None
    is_active: Optional[bool] = None
    client_id: Optional[int] = None

class StationResponse(StationBase):
    id: int
    client_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class StationList(BaseModel):
    items: List[StationResponse]
    total: int
