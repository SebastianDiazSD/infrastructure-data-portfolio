from app.models.report_request import ReportRequest
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
import io
from datetime import datetime


def build_docx(request: ReportRequest, report_text: str) -> bytes:
    """
    Builds a Bautagesbericht .docx from the request data and Claude-generated text.
    Full styling will be added on Day 2 — this is a working stub.
    """
    doc = Document()

    # Page margins
    for section in doc.sections:
        section.top_margin    = Cm(2)
        section.bottom_margin = Cm(2)
        section.left_margin   = Cm(2.5)
        section.right_margin  = Cm(2.5)

    # Title
    title = doc.add_heading("Bautagesbericht", 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Header info table (stub - full table on Day 2)
    doc.add_paragraph(f"Projekt:   {request.project_name} ({request.project_id})")
    doc.add_paragraph(f"Datum:     {request.date}")
    doc.add_paragraph(f"Bauleiter: {request.supervisor}")
    doc.add_paragraph(f"Wetter:    {request.weather.value}"
                      + (f", {request.temp_celsius}°C" if request.temp_celsius else ""))
    doc.add_paragraph("")

    # Claude-generated report body
    doc.add_heading("Bericht", level=1)
    for para in report_text.split("\n\n"):
        if para.strip():
            p = doc.add_paragraph(para.strip())
            p.paragraph_format.space_after = Pt(6)

    # Workforce table (stub)
    if request.workforce:
        doc.add_heading("Arbeitskräfte", level=1)
        table = doc.add_table(rows=1, cols=3)
        table.style = "Table Grid"
        hdr = table.rows[0].cells
        hdr[0].text = "Firma"
        hdr[1].text = "Gewerk"
        hdr[2].text = "Anzahl"
        for w in request.workforce:
            row = table.add_row().cells
            row[0].text = w.company
            row[1].text = w.trade
            row[2].text = str(w.headcount)

    # Issues
    if request.issues:
        doc.add_heading("Störungen / Probleme", level=1)
        doc.add_paragraph(request.issues)

    # Next steps
    if request.next_steps:
        doc.add_heading("Geplante Arbeiten (Folgetag)", level=1)
        doc.add_paragraph(request.next_steps)

    # Signature line
    doc.add_paragraph("")
    doc.add_paragraph(f"Unterschrift Bauleiter: ___________________________   Datum: {request.date}")

    # Return as bytes
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.read()
