from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class WeatherCondition(str, Enum):
    sonnig      = "sonnig"
    bewoelkt    = "bewölkt"
    regen       = "Regen"
    schnee      = "Schnee"
    wind        = "Wind"


class WorkforceEntry(BaseModel):
    company:    str = Field(..., description="Subcontractor or own company name")
    trade:      str = Field(..., description="Trade / Gewerk (e.g. Gleisbau, Tiefbau)")
    headcount:  int = Field(..., ge=0, description="Number of workers on site")


class EquipmentEntry(BaseModel):
    description: str = Field(..., description="Equipment name / Gerätebeschreibung")
    quantity:    int = Field(1, ge=1)


class ReportRequest(BaseModel):
    # Project identification
    project_id:   str = Field(..., description="Project number / Projektnummer")
    project_name: str = Field(..., description="Project name / Projektbezeichnung")
    date:         str = Field(..., description="Date in ISO format YYYY-MM-DD")
    supervisor:   str = Field(..., description="Site supervisor / Bauleiter")

    # Site conditions
    weather:      WeatherCondition = Field(..., description="Weather condition")
    temp_celsius: Optional[float]  = Field(None, description="Temperature in °C")

    # Work summary (either typed or transcribed from voice)
    work_summary: str = Field(..., description="Free-text description of work performed today")

    # Structured entries
    workforce:    List[WorkforceEntry]  = Field(default_factory=list)
    equipment:    List[EquipmentEntry]  = Field(default_factory=list)

    # Issues and notes
    issues:       Optional[str] = Field(None, description="Problems, delays, safety incidents")
    next_steps:   Optional[str] = Field(None, description="Planned work for next day")

    # Voice input (optional - transcribed by Whisper before reaching this model)
    voice_transcript: Optional[str] = Field(None, description="Raw Whisper transcript if used")
