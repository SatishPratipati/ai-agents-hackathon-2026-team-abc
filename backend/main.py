from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="Adaptive Multilingual Travel Assistant (AMTA) API",
    description="Backend services for dialect conversion, intent classification, and translation.",
    version="1.0.0"
)


from services.database import save_correction
from models import (
    NormalizeRequest, NormalizeResponse,
    IntentRequest, IntentResponse,
    TranslateRequest, TranslateResponse,
    FeedbackRequest, FeedbackResponse,
    AnalyticsResponse
)

from services.database import create_tables

create_tables()


from services.cache import query_cache
from services.gemini import process_query_with_gemini
from services.database import (
    db_init, log_query_db, check_overrides, 
    save_feedback_db, fetch_analytics_db, get_connection
)
import config

from services.dataset_service import find_translation


@app.get("/translation-test")
def translation_test():
    return find_translation(
        "విజయవాడ వెళ్లే ఆర్టీసీ బస్సు ఎప్పుడు ఉంది?"
    )

    
# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    db_init()

@app.get("/")
def read_root():
    return {"message": "AMTA Backend is running successfully!", "gemini_enabled": config.HAS_GEMINI}

@app.post("/normalize", response_model=NormalizeResponse)
def normalize_endpoint(request: NormalizeRequest):
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Input text cannot be empty")
        
    # Check memory cache first
    cached_data = query_cache.get(text)
    if cached_data:
        return NormalizeResponse(
            original_input=text,
            input_type=cached_data["input_type"],
            telugu_script=cached_data["telugu_script"],
            normalized_telugu=cached_data["normalized_telugu"],
            dialect=cached_data["dialect"]
        )
        
    # Check SQLite learning overrides first (Core Flagship Innovation)
    overrides = check_overrides(text)
    if overrides:
        # Cache the overridden data
        query_cache.set(text, overrides)
        query_cache.set(overrides["telugu_script"], overrides)
        query_cache.set(overrides["normalized_telugu"], overrides)
        
        # Log this matching query transaction
        log_query_db(
            original_text=text,
            input_type=overrides["input_type"],
            telugu_script=overrides["telugu_script"],
            normalized_telugu=overrides["normalized_telugu"],
            dialect=overrides["dialect"],
            intent=overrides["intent"],
            confidence=overrides["confidence"],
            english=overrides["en"],
            tamil=overrides["ta"],
            tamil_romanized=overrides["ta_romanized"]
        )
        
        return NormalizeResponse(
            original_input=text,
            input_type=overrides["input_type"],
            telugu_script=overrides["telugu_script"],
            normalized_telugu=overrides["normalized_telugu"],
            dialect=overrides["dialect"]
        )
        
    # If no override match, process via standard pipeline
    data = process_query_with_gemini(text)
    
    # Cache the result
    query_cache.set(text, data)
    query_cache.set(data["telugu_script"], data)
    query_cache.set(data["normalized_telugu"], data)
    
    # Log query to SQLite
    log_query_db(
        original_text=text,
        input_type=data["input_type"],
        telugu_script=data["telugu_script"],
        normalized_telugu=data["normalized_telugu"],
        dialect=data["dialect"],
        intent=data["intent"],
        confidence=data["confidence"],
        english=data["en"],
        tamil=data["ta"],
        tamil_romanized=data["ta_romanized"]
    )
    
    return NormalizeResponse(
        original_input=text,
        input_type=data["input_type"],
        telugu_script=data["telugu_script"],
        normalized_telugu=data["normalized_telugu"],
        dialect=data["dialect"]
    )

@app.post("/intent", response_model=IntentResponse)
def intent_endpoint(request: IntentRequest):
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Input text cannot be empty")
        
    # Check cache
    cached_data = query_cache.get(text)
    if cached_data:
        return IntentResponse(
            intent=cached_data["intent"],
            confidence=cached_data["confidence"],
            intent_distribution=cached_data["intent_distribution"]
        )
        
    # Check database override for normalized text intent
    overrides = check_overrides(text)
    if overrides:
        return IntentResponse(
            intent=overrides["intent"],
            confidence=overrides["confidence"],
            intent_distribution=overrides["intent_distribution"]
        )
        
    # Else process fully
    data = process_query_with_gemini(text)
    query_cache.set(text, data)
    
    return IntentResponse(
        intent=data["intent"],
        confidence=data["confidence"],
        intent_distribution=data["intent_distribution"]
    )


@app.get("/debug")
def debug():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT id, original_text, feedback_status
    FROM queries_log
    ORDER BY id DESC
    LIMIT 20
    """)

    rows = cursor.fetchall()
    conn.close()

    return [dict(r) for r in rows]


@app.post("/translate", response_model=TranslateResponse)
def translate_endpoint(request: TranslateRequest):
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Input text cannot be empty")
        
    # Check cache
    cached_data = query_cache.get(text)
    if cached_data:
        return TranslateResponse(
            en=cached_data["en"],
            ta=cached_data["ta"],
            ta_romanized=cached_data["ta_romanized"]
        )
        
    # Check override
    overrides = check_overrides(text)
    if overrides:
        return TranslateResponse(
            en=overrides["en"],
            ta=overrides["ta"],
            ta_romanized=overrides["ta_romanized"]
        )
        
    data = process_query_with_gemini(text)
    query_cache.set(text, data)
    
    return TranslateResponse(
        en=data["en"],
        ta=data["ta"],
        ta_romanized=data["ta_romanized"]
    )

@app.post("/feedback", response_model=FeedbackResponse)
def feedback_endpoint(request: FeedbackRequest):
    try:
        print("FEEDBACK HIT")
        print(request.dict())

        query_cache.clear()

        save_feedback_db(request)

        return FeedbackResponse(
            status="success",
            message="Feedback stored in SQLite database successfully!"
        )

    except Exception as e:
        print("ERROR:", e)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to store feedback in database: {str(e)}"
        )


@app.get("/fewshot")
def fewshot():
    from services.database import fetch_few_shot_examples
    return fetch_few_shot_examples()


@app.get("/feedback")
def get_feedback_logs():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM queries_log ORDER BY id DESC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load logs: {str(e)}"
        )

@app.get("/analytics", response_model=AnalyticsResponse)
def analytics_endpoint():
    try:
        analytics = fetch_analytics_db()
        return AnalyticsResponse(**analytics)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to aggregate database metrics: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=config.HOST, port=config.PORT, reload=True)
