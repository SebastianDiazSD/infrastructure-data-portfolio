import anthropic
import os
from dotenv import load_dotenv
from app.models.report_request import ReportRequest

load_dotenv()

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

SYSTEM_PROMPT = """Du bist ein erfahrener Baustellenassistent und hilfst beim Erstellen 
von Bautagesberichten auf Deutsch, Englisch und Spanisch. Du erhältst strukturierte Eingabedaten von der Baustelle 
und formulierst daraus einen professionellen, sachlichen Bericht im Stil eines deutschen, englischen oder spanischen 
Bauüberwacher. Verwende Fachbegriffe aus dem Gleisbau und Tiefbau wo passend.
Antworte ausschließlich mit dem Berichtstext, ohne Einleitung oder Erklärungen."""


def build_prompt(request: ReportRequest) -> str:
    workforce_lines = "\n".join(
        f"  - {w.company} ({w.trade}): {w.headcount} Personen"
        for w in request.workforce
    ) or "  - Keine Angaben"

    equipment_lines = "\n".join(
        f"  - {e.quantity}x {e.description}"
        for e in request.equipment
    ) or "  - Keine Angaben"

    return f"""Erstelle einen Bautagesbericht auf Basis folgender Angaben:

Projekt: {request.project_name} (Nr. {request.project_id})
Datum: {request.date}
Bauleiter: {request.supervisor}
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

{f'Sprachnotiz (transkribiert): {request.voice_transcript}' if request.voice_transcript else ''}

Formuliere einen professionellen Bautagesbericht (3-5 Absätze)."""


async def generate_report_text(request: ReportRequest) -> str:
    message = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": build_prompt(request)}
        ]
    )
    return message.content[0].text
