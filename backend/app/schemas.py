from typing import Literal

from pydantic import BaseModel, Field, field_validator

from .engine.crops import CROPS


class Priorities(BaseModel):
    profit: float = Field(1.0, ge=0, le=5)
    water: float = Field(1.0, ge=0, le=5)
    soil: float = Field(1.0, ge=0, le=5)
    resilience: float = Field(1.0, ge=0, le=5)


class CurrentPractice(BaseModel):
    warm: str = "fallow"
    cool: str = "fallow"

    @field_validator("warm", "cool")
    @classmethod
    def known_crop(cls, v: str) -> str:
        if v not in CROPS:
            raise ValueError(f"Unknown crop '{v}'")
        return v


class SoilOverride(BaseModel):
    phh2o: float | None = Field(None, ge=3, le=10)
    soc: float | None = Field(None, ge=0, le=200)
    texture: Literal["sandy", "loam", "clay"] | None = None


class RecommendRequest(BaseModel):
    lat: float = Field(..., ge=-60, le=75)
    lon: float = Field(..., ge=-180, le=180)
    priorities: Priorities = Priorities()
    current: CurrentPractice = CurrentPractice()
    irrigation: Literal["none", "limited", "full"] = "limited"
    seasons: int = Field(4, ge=2, le=6)
    soil_override: SoilOverride | None = None
