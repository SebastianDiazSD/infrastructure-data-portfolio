# prompts_template.py — committed to git as placeholder
# SYSTEM_PROMPT is loaded from environment variable on Render
import os
from app.models.report_request import ReportRequest

SYSTEM_PROMPT = os.environ.get("SYSTEM_PROMPT", "Du bist ein erfahrener Baustellenassistent und hilfst beim Erstellen von Bautagesberichten.")

LANGUAGE_NAMES = {"de": "Deutsch", "en": "English", "es": "Español"}


def build_prompt(request: ReportRequest) -> str:
    workforce_lines = "\n".join(
        f"  - {w.company} ({w.trade}): {w.headcount} Personen"
        for w in request.workforce
    ) or "  - Keine Angaben"

    equipment_lines = "\n".join(
        f"  - {e.quantity}x {e.description}"
        for e in request.equipment
    ) or "  - Keine Angaben"

    lang = LANGUAGE_NAMES.get(request.report_language, "Deutsch")

    return f"""Erstelle einen professionellen Bautagesbericht vollständig auf {lang}.
Schreibe AUSSCHLIESSLICH auf {lang}, unabhängig von der Sprache der Eingabedaten.

Projekt: {request.project_name} (Nr. {request.project_id})
Datum: {request.date}
Arbeitszeit: {request.start_time or 'nicht angegeben'} – {request.end_time or 'nicht angegeben'}
Bauüberwacher: {request.supervisor}
Wetter: {request.weather.value}{f', {request.temp_celsius}°C' if request.temp_celsius else ''}

Durchgeführte Arbeiten:
{request.work_summary}

Arbeitskräfte:
{workforce_lines}

Geräte und Maschinen:
{equipment_lines}

Probleme / Störungen:
{request.issues or 'Keine besonderen Vorkommnisse'}

Geplante Arbeiten für den nächsten Tag:
{request.next_steps or 'Gemäß Bauablaufplan'}

{f'Sprachnotiz (transkribiert): {request.voice_transcript}' if getattr(request, "voice_transcript", None) else ''}

Formuliere einen professionellen Bericht in {lang} (3 Absätze).
Verwende kein Markdown, keine Sternchen. Nur Fließtext mit Absätzen.
Beginne DIREKT mit dem ersten inhaltlichen Absatz."""