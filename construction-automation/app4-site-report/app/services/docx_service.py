from app.models.report_request import ReportRequest
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from docx.enum.text import WD_ALIGN_PARAGRAPH
import io


G2T_BLUE = RGBColor(0x2E, 0x5F, 0xA3)


def set_cell_bg(cell, hex_color: str):
    """Set table cell background colour."""
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:fill'), hex_color)
    shd.set(qn('w:val'), 'clear')
    tcPr.append(shd)


def add_section_heading(doc, text: str):
    """Add a G2T blue heading."""
    h = doc.add_heading(text, level=1)
    if h.runs:
        h.runs[0].font.color.rgb = G2T_BLUE
    return h


def build_docx(request: ReportRequest, report_text: str) -> bytes:
    doc = Document()

    # Page margins
    for section in doc.sections:
        section.top_margin    = Cm(2)
        section.bottom_margin = Cm(2)
        section.left_margin   = Cm(2.5)
        section.right_margin  = Cm(2.5)

    # ── Title ─────────────────────────────────────────────────────
    title = doc.add_heading("BAUTAGESBERICHT", 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if title.runs:
        title.runs[0].font.color.rgb = G2T_BLUE

    # ── Header info table (2-column) ──────────────────────────────
    info_table = doc.add_table(rows=4, cols=2)
    info_table.style = "Table Grid"
    info_data = [
        ("Projekt",       f"{request.project_name} ({request.project_id})"),
        ("Datum",         request.date),
        ("Bauüberwacher", request.supervisor),
        ("Wetter",        f"{request.weather.value}" +
                          (f", {request.temp_celsius}°C" if request.temp_celsius else "")),
    ]
    for i, (label, value) in enumerate(info_data):
        row = info_table.rows[i].cells
        row[0].text = label
        row[1].text = value
        set_cell_bg(row[0], "D6E4F7")  # light blue label column
        for cell in row:
            cell.paragraphs[0].runs[0].font.bold = (cell == row[0])

    doc.add_paragraph("")

    # ── Report body (Claude-generated) ───────────────────────────
    add_section_heading(doc, "Durchgeführte Arbeiten")
    # Strip Claude's own header line if present (first line often repeats title)
    lines = report_text.strip().split("\n\n")
    for para in lines:
        clean = para.strip()
        # Skip if it's just a header Claude added
        if clean.upper() in ("BAUTAGESBERICHT", "DAILY CONSTRUCTION REPORT",
                             "INFORME DE OBRA DIARIA"):
            continue
        if clean:
            p = doc.add_paragraph(clean)
            p.paragraph_format.space_after = Pt(6)

    # ── Workforce table ───────────────────────────────────────────
    add_section_heading(doc, "Arbeitskräfte")
    if request.workforce:
        wf_table = doc.add_table(rows=1, cols=3)
        wf_table.style = "Table Grid"
        hdr = wf_table.rows[0].cells
        for i, label in enumerate(["Firma", "Gewerk", "Anzahl"]):
            hdr[i].text = label
            set_cell_bg(hdr[i], "2E5FA3")
            hdr[i].paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            hdr[i].paragraphs[0].runs[0].font.bold = True
        for w in request.workforce:
            row = wf_table.add_row().cells
            row[0].text = w.company
            row[1].text = w.trade
            row[2].text = str(w.headcount)
    else:
        doc.add_paragraph("Keine Angaben")

    # ── Equipment table ───────────────────────────────────────────
    add_section_heading(doc, "Geräte und Maschinen")
    if request.equipment:
        eq_table = doc.add_table(rows=1, cols=2)
        eq_table.style = "Table Grid"
        hdr = eq_table.rows[0].cells
        for i, label in enumerate(["Gerät / Maschine", "Anzahl"]):
            hdr[i].text = label
            set_cell_bg(hdr[i], "2E5FA3")
            hdr[i].paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            hdr[i].paragraphs[0].runs[0].font.bold = True
        for e in request.equipment:
            row = eq_table.add_row().cells
            row[0].text = e.description
            row[1].text = str(e.quantity)
    else:
        doc.add_paragraph("Keine Angaben")

    # ── Issues (always shown) ─────────────────────────────────────
    add_section_heading(doc, "Störungen / Probleme")
    doc.add_paragraph(request.issues or "Keine besonderen Vorkommnisse")

    # ── Next steps (always shown) ─────────────────────────────────
    add_section_heading(doc, "Geplante Arbeiten (Folgetag)")
    doc.add_paragraph(request.next_steps or "Gemäß Bauablaufplan")

    # ── Signature ─────────────────────────────────────────────────
    doc.add_paragraph("")
    doc.add_paragraph(
        f"Unterschrift Bauüberwacher: ___________________________"
        f"          Datum: {request.date}"
    )

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.read()