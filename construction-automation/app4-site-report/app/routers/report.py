from fastapi import APIRouter, HTTPException, Depends
from app.models.report_request import ReportRequest
from app.services.claude_service import generate_report_text
from app.services.docx_service import build_docx
from fastapi.responses import StreamingResponse
from fastapi import Request as FastAPIRequest
from app.routers.auth import get_current_user
from app.services.report_store import save_report, get_reports
from app.database import get_db
from app.limiter import limiter
import io

router = APIRouter()


@router.post("/generate-report")
@limiter.limit("20/minute")
async def generate_report(
    request: ReportRequest,
    req: FastAPIRequest,
    current_user=Depends(get_current_user),
):
    if not request.work_summary.strip():
        raise HTTPException(422, detail="work_summary is required")
    try:
        report_text = await generate_report_text(request)
        docx_bytes  = build_docx(request, report_text)
        filename = f"Bautagesbericht_{request.project_id}_{request.date}.docx"

        try:
            await save_report(report_data=request.model_dump(), user_id=current_user.id)
        except Exception as store_err:
            print(f"[WARN] Report storage failed (non-blocking): {store_err}")

        return StreamingResponse(
            io.BytesIO(docx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Report generation failed. Please try again.")

@router.get("/reports")
async def list_reports(current_user=Depends(get_current_user)):
    records = await get_reports(user_id=current_user.id)
    return {"reports": records, "count": len(records)}


@router.get("/reports/{report_id}")
async def get_report(report_id: str, current_user=Depends(get_current_user)):
    from app.services.report_store import get_report_by_id
    doc = await get_report_by_id(report_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Report not found")
    if doc.get("user_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return doc

@router.put("/reports/{report_id}")
async def update_report(
    report_id: str,
    updated_data: dict,
    current_user=Depends(get_current_user)
):
    from app.services.report_store import get_report_by_id
    from bson import ObjectId
    doc = await get_report_by_id(report_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Report not found")
    if doc.get("user_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if doc.get("locked"):
        raise HTTPException(status_code=403, detail="Report is locked — editing not permitted after 7 days")
    db = get_db()
    await db.reports.update_one(
        {"_id": ObjectId(report_id)},
        {"$set": {"report_data": updated_data}}
    )
    return {"updated": True, "report_id": report_id}