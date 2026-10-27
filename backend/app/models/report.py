from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)

    # Station info
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False)
    station = relationship("Station", back_populates="reports")

    # Who created it
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by_user = relationship("User", back_populates="reports")

    # Date of intervention
    intervention_date = Column(DateTime, nullable=False)

    # Zone cleaned
    zone = Column(String(100), nullable=False)

    # Agent name
    agent_name = Column(String(255), nullable=False)

    # Photos (stored as URLs or paths)
    photo_before = Column(String(500), nullable=True)
    photo_after = Column(String(500), nullable=True)

    # Observations
    observations = Column(Text, nullable=True)

    # GPS coordinates (optional)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Status
    status = Column(String(50), default="completed")  # completed, pending, cancelled

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Report {self.id} - Station {self.station_id} - {self.zone}>"
