# prompts_template.py — committed to git as placeholder
# SYSTEM_PROMPT is loaded from environment variable on Render
import os
from app.models.report_request import ReportRequest

SYSTEM_PROMPT = os.environ.get(
    "SYSTEM_PROMPT",
    "Du bist ein erfahrener Baustellenassistent und hilfst beim Erstellen von Bautagesberichten."
)

LANGUAGE_NAMES = {"de": "Deutsch", "en": "English", "es": "Español"}

NO_WORKS_REASON_LABELS = {
    "kein_arbeitstag":      {"de": "Kein geplanter Arbeitstag",        "en": "No working day planned",          "es": "Día no laborable"},
    "havarie":              {"de": "Havarie / Betriebsstörung",         "en": "Breakdown / operational incident", "es": "Avería / incidente operativo"},
    "extremwetter":         {"de": "Extremwetter / Unwetter",           "en": "Extreme weather / storm",          "es": "Clima extremo / tormenta"},
    "sicherheit":           {"de": "Terrorlage / Sicherheitsereignis",  "en": "Security event",                   "es": "Evento de seguridad"},
    "technischer_ausfall":  {"de": "Technischer Ausfall",               "en": "Technical failure",                "es": "Fallo técnico"},
    "sonstiges":            {"de": "Sonstiges",                         "en": "Other",                            "es": "Otros"},
}

SCHWERE_LABELS = {
    "minor":    {"de": "Gering",    "en": "Minor",    "es": "Leve"},
    "major":    {"de": "Erheblich", "en": "Major",    "es": "Grave"},
    "critical": {"de": "Kritisch",  "en": "Critical", "es": "Crítico"},
}


def build_prompt(request: ReportRequest) -> str:
    lang = LANGUAGE_NAMES.get(request.report_language, "Deutsch")
    lang_key = request.report_language if request.report_language in ("de", "en", "es") else "de"

    # ── No-works day ──────────────────────────────────────────────────────────
    if request.no_works:
        reason_key = request.no_works_reason or "kein_arbeitstag"
        reason_label = NO_WORKS_REASON_LABELS.get(reason_key, {}).get(lang_key, reason_key)
        if request.no_works_reason_text:
            reason_label += f": {request.no_works_reason_text}"

        if reason_key == "kein_arbeitstag":
            return f"""Erstelle einen einzelnen sachlichen Satz auf {lang} für einen Bautagesbericht.
Datum: {request.date}. Projekt: {request.project_name} (Nr. {request.project_id}).
Der Satz soll festhalten, dass an diesem Tag kein geplanter Arbeitstag stattfand.
Kein Markdown. Kein Titel. Nur der Satz."""
        else:
            besonderheiten_block = f"\nBesondere Vorkommnisse:\n  {request.besonderheiten}" if request.besonderheiten else ""
            return f"""Erstelle einen professionellen Bautagesbericht-Abschnitt vollständig auf {lang}.
Schreibe sachlich. Kein Markdown, keine Sternchen. Nur Fließtext (1–2 Absätze).
Beginne DIREKT mit dem ersten inhaltlichen Absatz.

Projekt: {request.project_name} (Nr. {request.project_id})
Datum: {request.date}
Bauüberwacher: {request.supervisor}

An diesem Tag wurden keine Bauarbeiten durchgeführt.
Grund: {reason_label}
{besonderheiten_block}

Formuliere dies formal und sachlich. Erwähne explizit den Grund für den Arbeitsausfall."""

    # ── Normal working day ────────────────────────────────────────────────────
    workforce_lines = "\n".join(
        f"  - {w.role}: {w.count} Personen"
        for w in request.workforce
    ) or "  - Keine Angaben"

    equipment_lines = "\n".join(
        f"  - {e.count}x {e.name}"
        for e in request.equipment
    ) or "  - Keine Angaben"

    abnahme_block = ""
    if request.abnahme and request.abnahme.item:
        ab = request.abnahme
        result_map = {"pass": "Bestanden", "fail": "Nicht bestanden", "conditional": "Bedingt bestanden"}
        result_str = result_map.get(ab.result or "", ab.result or "—")
        abnahme_block = (
            f"\nAbnahme:\n"
            f"  Objekt: {ab.item}\n"
            f"  Abgenommen von: {ab.approver or '—'}\n"
            f"  Uhrzeit: {ab.time or '—'}\n"
            f"  Ergebnis: {result_str}\n"
            f"  Anmerkungen: {ab.notes or '—'}"
        )

    stoerungen_block = f"\nStörungen / Verzögerungen:\n  {request.stoerungen}" if request.stoerungen else ""
    besonderheiten_block = f"\nBesondere Vorkommnisse:\n  {request.besonderheiten}" if request.besonderheiten else ""
    bg_block = "\n  ⚠ BG-MELDUNG ERFORDERLICH — Arbeitsunfall gemeldet." if request.bg_meldung else ""
    next_steps_block = f"\nGeplante Arbeiten (Folgetag):\n  {request.next_steps}" if request.next_steps else ""

    maengel_block = ""
    if request.maengel:
        lines = []
        for i, m in enumerate(request.maengel, 1):
            schwere_label = SCHWERE_LABELS.get(m.schwere or "", {}).get(lang_key, m.schwere or "—")
            lines.append(
                f"  Mangel {i}: {m.beschreibung or '—'} | "
                f"Ort: {m.ort or '—'} | "
                f"Verantwortlich: {m.verantwortlich or '—'} | "
                f"Frist: {m.frist or '—'} | "
                f"Schwere: {schwere_label}"
            )
        maengel_block = "\nFestgestellte Mängel:\n" + "\n".join(lines)

    weather_str = request.weather or "nicht angegeben"
    if request.temp_celsius is not None:
        weather_str += f", {request.temp_celsius}°C"

    return f"""Erstelle einen professionellen Bautagesbericht vollständig auf {lang}.
Schreibe AUSSCHLIESSLICH auf {lang}, unabhängig von der Sprache der Eingabedaten.
Schreibe sachlich und präzise. Vermeide Floskeln wie "effiziente Abwicklung", "zügige Umsetzung" oder "planmäßiger Verlauf". Beschreibe nur konkret was gemacht wurde.

Projekt: {request.project_name} (Nr. {request.project_id})
Datum: {request.date}
Arbeitszeit: {request.start_time or 'nicht angegeben'} – {request.end_time or 'nicht angegeben'}
Bauüberwacher: {request.supervisor}
Wetter: {weather_str}

Durchgeführte Arbeiten:
{request.work_summary}

Arbeitskräfte:
{workforce_lines}

Geräte und Maschinen:
{equipment_lines}
{abnahme_block}
{stoerungen_block}
{besonderheiten_block}
{bg_block}
{next_steps_block}
{maengel_block}
{f'Sprachnotiz (transkribiert): {request.voice_transcript}' if getattr(request, 'voice_transcript', None) else ''}

Formuliere einen professionellen Bericht in {lang} (3 Absätze).
Verwende kein Markdown, keine Sternchen. Nur Fließtext mit Absätzen.
Beginne DIREKT mit dem ersten inhaltlichen Absatz."""