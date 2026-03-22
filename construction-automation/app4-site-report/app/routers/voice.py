from fastapi import APIRouter, UploadFile, File,HTTPException
from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()

router = APIRouter()
client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

@router.post('/transcribe')
async def transcribe(file: UploadFile = File(...)):
    ALLOWED_TYPES = {'audio/', 'video/mp4', 'application/octet-stream'}
    if not any(file.content_type.startswith(t) for t in ALLOWED_TYPES):
        raise HTTPException(status_code=422, detail='Bitte eine Audiodatei hochladen')
    audio=await file.read()
    result=client.audio.transcriptions.create(
        model="whisper-1",
        file=(file.filename,audio,file.content_type),
        language='de'  #force german
    )

    return {'transcription': result.text}