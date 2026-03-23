from pydantic import BaseModel, Field,field_validator
from typing import Optional, List, Literal


class WorkforceEntry(BaseModel):
    role:  str = Field(..., description="Role / Funktion (e.g. Bauleiter, Facharbeiter)")
    count: int = Field(..., ge=0, description="Number of workers")


class EquipmentEntry(BaseModel):
    name:  str = Field(..., description="Equipment name / Gerätebeschreibung")
    count: int = Field(1, ge=1)


class AbnahmeEntry(BaseModel):
    item:     Optional[str] = Field(None, description="Inspection object / Abnahmeobjekt")
    approver: Optional[str] = Field(None, description="Approved by / Abgenommen von")
    time:     Optional[str] = Field(None, description="Time of inspection HH:MM")
    result:   Optional[str] = Field(None, description="pass | fail | conditional")
    notes:    Optional[str] = Field(None, description="Additional notes / Anmerkungen")

class MangelEntry(BaseModel):
    beschreibung: Optional[str]
    ort: Optional[str]           # km point / location
    verantwortlich: Optional[str]
    frist: Optional[str]         # remediation deadline
    schwere: Optional[Literal["minor", "major", "critical"]]

class ReportRequest(BaseModel):
    # ── Project identification ─────────────────────────────────────────────────
    project_id:   str = Field(..., description="Project number / Projektnummer")
    project_name: str = Field(..., description="Project name / Projektbezeichnung")
    date:         str = Field(..., description="Date in ISO format YYYY-MM-DD")
    supervisor:   str = Field(..., description="Site supervisor / Bauüberwacher")

    # ── Shift duration ────────────────────────────────────────────────────────
    start_time: Optional[str] = None
    end_time:   Optional[str] = None

    # ── Site conditions ───────────────────────────────────────────────────────
    weather:      Optional[str]   = Field(None, description="Weather condition (free text)")
    temp_celsius: Optional[float] = Field(None, description="Temperature in °C")

    # ── Work summary ──────────────────────────────────────────────────────────
    work_summary: str = Field(..., description="Free-text description of work performed today")

    no_works: bool = False
    no_works_reason: Optional[
        Literal["kein_arbeitstag", "havarie", "extremwetter", "sicherheit", "technischer_ausfall", "sonstiges"]] = None
    no_works_reason_text: Optional[str] = None  # only if "sonstiges"

    # Mängel
    maengel: Optional[List[MangelEntry]] = None

    # ── Structured entries ────────────────────────────────────────────────────
    workforce: List[WorkforceEntry] = Field(default_factory=list)
    equipment: List[EquipmentEntry] = Field(default_factory=list)

    # ── Optional structured sections (skippable steps) ────────────────────────
    abnahme:         Optional[AbnahmeEntry] = Field(None, description="Formal inspection / Abnahme")
    stoerungen:      Optional[str]          = Field(None, description="Issues and delays / Störungen")
    besonderheiten:  Optional[str]          = Field(None, description="Special incidents / Besondere Vorkommnisse")
    bg_meldung:      bool                   = Field(False, description="Workplace injury flag for BG reporting")
    next_steps:      Optional[str]          = Field(None, description="Planned work for next day")

    # ── Output language ───────────────────────────────────────────────────────
    report_language: Literal["de", "en", "es"] = Field(
        "de", description="Output language: de=Deutsch, en=English, es=Español"
    )

    # ── Voice input ───────────────────────────────────────────────────────────
    voice_transcript: Optional[str] = Field(None, description="Raw Whisper transcript if used")

    # ── Validators ────────────────────────────────────────────────────────────
    @field_validator("work_summary")
    @classmethod
    def validate_work_summary(cls, v, info):
        if not v and not info.data.get("no_works"):
            raise ValueError("work_summary is required when no_works is False")
        return v