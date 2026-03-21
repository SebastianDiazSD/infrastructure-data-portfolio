from fastapi import APIRouter, HTTPException
from app.models.report_request import ReportRequest
from app.services.claude_service import generate_report_text
from app.services.docx_service import build_docx
from fastapi.responses import StreamingResponse
import io

router = APIRouter()


@router.post("/generate-report")
async def generate_report(request: ReportRequest):
    """
    Accepts structured site inspection data,
    generates a Bautagesbericht via Claude, returns a .docx file.
    """
    if not request.work_summary.strip():
        raise HTTPException(422,detail="work_summary is required")
    try:
        report_text = await generate_report_text(request)
        docx_bytes  = build_docx(request, report_text)

        filename = f"Bautagesbericht_{request.project_id}_{request.date}.docx"
        return StreamingResponse(
            io.BytesIO(docx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-report/test")
async def generate_report_test(request: ReportRequest):
    if not request.work_summary.strip():
        raise HTTPException(status_code=422, detail="work_summary darf nicht leer sein")
    report_test=await generate_report_text(request)
    return {'report':report_test}