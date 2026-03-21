"""
test_claude.py
Run this to verify your ANTHROPIC_API_KEY is working before Day 1.
Usage: python test_claude.py
"""
import os
from dotenv import load_dotenv
import anthropic

load_dotenv()

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

message = client.messages.create(
    model="claude-haiku-4-5",
    max_tokens=100,
    messages=[
        {"role": "user", "content": "Antworte auf Deutsch: Was ist ein Bautagesbericht? (1 Satz)"}
    ]
)

print("✔ Claude API connection successful!")
print(f"Response: {message.content[0].text}")
