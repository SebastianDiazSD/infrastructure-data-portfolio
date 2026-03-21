# prompts_template.py — committed to git as placeholder
# To use: copy this file to prompts.py and fill in your own prompts.

from app.models.report_request import ReportRequest

SYSTEM_PROMPT = "YOUR_SYSTEM_PROMPT_HERE"

LANGUAGE_NAMES = {"de": "Deutsch", "en": "English", "es": "Español"}


def build_prompt(request: ReportRequest) -> str:
    return "YOUR_PROMPT_LOGIC_HERE"