# app/services/parse_service.py
# Extracts structured report data from free-text or voice transcript.
# Model-agnostic: swap claude for local LLM in 2027 by replacing _call_claude().

import json
import re
import os
from anthropic import Anthropic
from app.models.report_request import ReportRequest

client = Anthropic()
MODEL = "claude-haiku-4-5"

SYSTEM_PROMPT = """Du bist ein Datenextraktions-Assistent für Bautagesberichte.
Du erhältst einen freien Text (gesprochen oder getippt) von einem Bauüberwacher.
Deine Aufgabe: extrahiere alle Informationen und gib sie als JSON zurück.
Antworte NUR mit dem JSON-Objekt. Kein Markdown, keine Erklärungen, keine Codeblöcke.
Fehlende Felder: setze null, nicht weglassen."""

# Required fields — absence triggers recovery UI
REQUIRED_FIELDS = ["project_id", "project_name", "date", "supervisor", "work_summary"]


def _build_extraction_prompt(raw_text: str, language: str) -> str:
    return f"""Extrahiere aus folgendem Text alle verfügbaren Informationen für einen Bautagesbericht.
Eingabesprache: {language}

TEXT:
{raw_text}

Gib ein JSON-Objekt mit genau diesen Feldern zurück:
{{
  "project_id": "Projektnummer oder ID, z.B. NBS-2026-001" | null,
  "project_name": "Projektname / Bezeichnung" | null,
  "date": "Datum im Format YYYY-MM-DD" | null,
  "supervisor": "Name des Bauüberwachers" | null,
  "start_time": "Startzeit HH:MM" | null,
  "end_time": "Endzeit HH:MM" | null,
  "weather": "Wetterbedingung als Text" | null,
  "temp_celsius": Temperatur als Zahl | null,
  "work_summary": "Zusammenfassung der durchgeführten Arbeiten" | null,
  "no_works": true | false,
  "no_works_reason": "kein_arbeitstag" | "havarie" | "extremwetter" | "sicherheit" | "technischer_ausfall" | "sonstiges" | null,
  "no_works_reason_text": "Freitext falls sonstiges" | null,
  "workforce": [
    {{"role": "Funktion", "count": Anzahl}}
  ],
  "equipment": [
    {{"name": "Gerätename", "count": Anzahl}}
  ],
  "abnahme": {{
    "item": "Abnahmeobjekt" | null,
    "approver": "Abgenommen von" | null,
    "time": "Uhrzeit HH:MM" | null,
    "result": "pass" | "fail" | "conditional" | null,
    "notes": "Anmerkungen" | null
  }} | null,
  "maengel": [
    {{
      "beschreibung": "Beschreibung des Mangels",
      "ort": "Ort / km-Punkt" | null,
      "verantwortlich": "Verantwortliche Firma / Person" | null,
      "frist": "Frist zur Behebung" | null,
      "schwere": "minor" | "major" | "critical"
    }}
  ] | null,
  "stoerungen": "Störungen und Verzögerungen als Text" | null,
  "besonderheiten": "Besondere Vorkommnisse als Text" | null,
  "bg_meldung": true | false,
  "next_steps": "Geplante Arbeiten für Folgetag" | null,
  "report_language": "de" | "en" | "es"
}}

Hinweise:
- Datumswerte normalisieren: "heute", "23. März 2026", "23.03.26" → "2026-03-23"
- Zeiten normalisieren: "sieben Uhr" → "07:00", "17 Uhr" → "17:00"
- Zahlen ausschreiben normalisieren: "sechzehn Facharbeiter" → 16
- Schwere von Mängeln: gering/leicht → "minor", erheblich/mittel → "major", kritisch/schwerwiegend → "critical"
- Abnahme-Ergebnis: bestanden/ok/passed → "pass", nicht bestanden/failed → "fail", bedingt/conditional → "conditional"
- Wenn keine Arbeitskräfte erwähnt: leeres Array []
- Wenn keine Geräte erwähnt: leeres Array []
- report_language: erkenne die Sprache des Textes oder übernimm den übergebenen Wert: {language}"""


def _call_claude(prompt: str) -> dict:
    response = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = response.content[0].text.strip()
    # Strip accidental markdown fences
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)


def parse_raw_input(raw_text: str, language: str = "de") -> dict:
    """
    Returns:
      {
        "parsed": dict,           # all extracted fields
        "missing_required": list, # required fields that are null/empty
        "missing_optional": list  # optional fields that are null (informational)
      }
    """
    prompt = _build_extraction_prompt(raw_text, language)
    parsed = _call_claude(prompt)

    # Ensure all required fields are present as keys
    for f in REQUIRED_FIELDS:
        if f not in parsed:
            parsed[f] = None

    # work_summary is not required when no_works is true
    effective_required = [
        f for f in REQUIRED_FIELDS
        if not (f == "work_summary" and parsed.get("no_works"))
    ]

    missing_required = [
        f for f in effective_required
        if not parsed.get(f)
    ]

    missing_optional = [
        f for f in ["weather", "start_time", "end_time", "temp_celsius",
                    "abnahme", "stoerungen", "besonderheiten", "next_steps", "maengel"]
        if parsed.get(f) is None
    ]

    return {
        "parsed": parsed,
        "missing_required": missing_required,
        "missing_optional": missing_optional,
    }