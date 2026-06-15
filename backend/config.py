import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load .env file if it exists
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    HAS_GEMINI = True
else:
    HAS_GEMINI = False

PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "127.0.0.1")
