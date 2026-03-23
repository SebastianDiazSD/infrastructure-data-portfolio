# app/routers/parse.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.parse_service import parse_raw_input

router = APIRouter()


class ParseRequest(BaseModel):
    raw_text: str
    language: str = "de"


class ParseResponse(BaseModel):
    parsed: dict
    missing_required: list
    missing_optional: list


@router.post("/parse-input", response_model=ParseResponse)
async def parse_input(request: ParseRequest):
    if not request.raw_text.strip():
        raise HTTPException(status_code=400, detail="raw_text is empty")
    try:
        result = parse_raw_input(request.raw_text, request.language)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {str(e)}")