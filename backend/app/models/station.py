from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base

class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False, index=True)
    address = Column(Text, nullable=True)

    # Client associated with this station
    client_id = Column(Integer, nullable=True)

    # Zones available in this station (e.g., ["Pompes", "Boutique", "Parking"])
    zones = Column(JSON, default=list)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    reports = relationship("Report", back_populates="station", lazy="selectin")

    def __repr__(self):
        return f"<Station {self.code} - {self.city}>"
