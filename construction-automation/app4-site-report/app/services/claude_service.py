import anthropic
import os
from dotenv import load_dotenv
from app.models.report_request import ReportRequest
from app.services.prompts import SYSTEM_PROMPT, build_prompt

load_dotenv()

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


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