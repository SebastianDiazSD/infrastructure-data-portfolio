import anthropic
import os
from dotenv import load_dotenv
from fastapi import HTTPException
from app.models.report_request import ReportRequest
from app.services.prompts import SYSTEM_PROMPT, build_prompt

load_dotenv()

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


async def generate_report_text(request: ReportRequest) -> str:
    try:
        message = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=1024,
            timeout=30.0,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": build_prompt(request)}]
        )
        text = message.content[0].text.strip()
        if not text:
            raise HTTPException(500, "Leere Antwort von Claude erhalten")
        return text
    except anthropic.APITimeoutError:
        raise HTTPException(503, "Claude Timeout — bitte erneut versuchen")
    except anthropic.BadRequestError as e:
        raise HTTPException(400, f"Ungültige Anfrage: {e}")
    except anthropic.APIError as e:
        raise HTTPException(502, f"Claude API Fehler: {e}")