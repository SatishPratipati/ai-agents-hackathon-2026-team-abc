import json
import logging
import google.generativeai as genai
from config import HAS_GEMINI, GEMINI_API_KEY
from services.fallback import run_full_fallback
from services.dataset_service import (
    find_normalization,
    find_intent,
    find_translation
)

logger = logging.getLogger(__name__)

def process_query_with_gemini(text: str) -> dict:

    # ====================================
    # DATASET LOOKUP FIRST
    # ====================================

    norm = find_normalization(text)
    intent = find_intent(text)
    translation = find_translation(text)

    print("INPUT:", text)
    print("NORMALIZATION:", norm)
    print("INTENT:", intent)
    print("TRANSLATION:", translation)

    if norm and intent and translation:

        print("DATASET MATCH FOUND")

        return {
            "input_type": norm["input_type"],
            "telugu_script": norm["telugu_script"],
            "normalized_telugu": norm["normalized_telugu"],
            "dialect": norm["dialect"],
            "intent": intent,
            "confidence": 100,
            "intent_distribution": {
                "Transportation": 0.0,
                "Navigation / Direction": 0.0,
                "Food / Dining": 0.0,
                "Accommodation": 0.0,
                "Shopping": 0.0,
                "Emergency": 0.0,
                "Healthcare": 0.0,
                "Tourism": 0.0,
                "General Query": 0.0,
                intent: 1.0
            },
            "en": translation["en"],
            "ta": translation["ta"],
            "ta_romanized": translation["ta_romanized"]
        }

    print("USING GEMINI")

    # ====================================
    # GEMINI AVAILABILITY CHECK
    # ====================================

    if not HAS_GEMINI or not GEMINI_API_KEY:
        logger.warning(
            "Gemini API not configured or API Key is missing. Falling back to rule-based engine."
        )
        return run_full_fallback(text)

    # continue with few_shot_str ... 
    # Fetch dynamic few-shot corrections from the database
    few_shot_str = ""
    try:
        from services.database import fetch_few_shot_examples
        examples = fetch_few_shot_examples()
        if examples:
            few_shot_str = "\nDynamic User Corrections (Few-Shot Context to learn from):\n"
            for ex in examples:
                few_shot_str += f"Query: \"{ex['telugu']}\"\n"
                few_shot_str += f"  - Predicted English: \"{ex['original_en']}\" -> USER CORRECTED English: \"{ex['corrected_en']}\"\n"
                few_shot_str += f"  - Predicted Tamil: \"{ex['original_ta']}\" -> USER CORRECTED Tamil: \"{ex['corrected_ta']}\"\n"
                few_shot_str += f"  - Predicted Tamil Romanized: \"{ex['original_ta_rom']}\" -> USER CORRECTED Tamil Romanized: \"{ex['corrected_ta_rom']}\"\n\n"
    except Exception as db_err:
        logger.error(f"Failed to load dynamic corrections for few-shot prompting: {db_err}")

    prompt = f"""
You are an expert linguistic processor and translator specialized in Telugu dialects and Tamil translation.
Analyze the following travel query:
"{text}"

Provide your response in JSON format. Do not wrap the JSON in ```json markdown blocks. Return only raw JSON.
The JSON must match the following structure:
{{
  "input_type": "Roman Telugu" or "Telugu Script",
  "telugu_script": "Telugu script equivalent of the input. If the input is Roman Telugu, transliterate it to Telugu script. If it is already Telugu script, return it exactly as is.",
  "normalized_telugu": "Normalized Standard Telugu. Normalize regional dialectal variations to formal standard Telugu. E.g., 'వస్తది' -> 'వస్తుంది', 'ఎట్లా' -> 'ఎలా', 'పోవాలా' -> 'వెళ్ళాలా', 'అంగడి' -> 'దుకాణం', 'ఉండాది' -> 'ఉంది', 'చెప్పాల' -> 'చెప్పాలి'. Check for other regional dialect indicators too.",
  "dialect": "Telangana" or "Rayalaseema" or "Uttarandhra" or "Standard Telugu" or "Unknown",
  "intent": "Transportation" or "Navigation / Direction" or "Food / Dining" or "Accommodation" or "Shopping" or "Emergency" or "Healthcare" or "Tourism" or "General Query",
  "confidence": <integer between 0 and 100 indicating the confidence score for the classified intent>,
  "intent_distribution": {{
    "Transportation": <float probability between 0.0 and 1.0>,
    "Navigation / Direction": <float probability between 0.0 and 1.0>,
    "Food / Dining": <float probability between 0.0 and 1.0>,
    "Accommodation": <float probability between 0.0 and 1.0>,
    "Shopping": <float probability between 0.0 and 1.0>,
    "Emergency": <float probability between 0.0 and 1.0>,
    "Healthcare": <float probability between 0.0 and 1.0>,
    "Tourism": <float probability between 0.0 and 1.0>,
    "General Query": <float probability between 0.0 and 1.0>
  }},
  "en": "Formal and natural English translation of the normalized Telugu query",
  "ta": "Formal Tamil script translation of the normalized Telugu query",
  "ta_romanized": "Phonetic English transliteration of the Tamil translation (e.g. 'பேருந்து எப்போது வரும்?' -> 'Perunthu eppodhu varum?')"
}}
{few_shot_str}
Linguistic Rules:
1. Correctly categorize regional dialects. If Telangana terms like 'వస్తది' or Rayalaseema 'ఉండాది' or Uttarandhra verb endings 'చెప్పాల' are present, classify as that dialect. If no dialect markers are present, output 'Standard Telugu' or 'Unknown'.
2. The intent distribution values must sum to 1.0.
3. Transliterate Roman Telugu carefully. Use Standard Telugu spelling in `telugu_script` while keeping the original meaning intact.
4. If the query is a long sentence, carefully parse all clauses to determine the primary intent and distribute probabilities to other relevant intents in the 'intent_distribution'.
5. Pay close attention to 'Dynamic User Corrections' above. If similar words or grammar appear in the input query, prioritize using translations matching the corrected formats.
"""

    try:
        # We will use the standard gemini-2.5-flash model
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        # Parse the JSON response
        result = json.loads(response.text.strip())
        
        # Validate that required keys are present
        required_keys = ["input_type", "telugu_script", "normalized_telugu", "dialect", "intent", "confidence", "intent_distribution", "en", "ta", "ta_romanized"]
        for key in required_keys:
            if key not in result:
                raise ValueError(f"Missing key in Gemini response: {key}")
                
        return result
        
    except Exception as e:
        logger.error(f"Gemini API request failed: {e}. Falling back to rule-based engine.")
        # Return fallback results
        return run_full_fallback(text)
