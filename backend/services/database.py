import sqlite3
import os
import re
import datetime
from typing import Dict, Any, List, Optional, Tuple
from models import FeedbackRequest
def get_db_connection():
    return get_connection()
DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
DB_FILE = os.path.join(DB_DIR, "amta.db")

import sqlite3

DB_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data"
)

DB_FILE = os.path.join(DB_DIR, "amta.db")

def create_tables():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS corrections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        telugu TEXT,

        original_en TEXT,
        corrected_en TEXT,

        original_ta TEXT,
        corrected_ta TEXT,

        original_ta_rom TEXT,
        corrected_ta_rom TEXT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    conn.commit()
    conn.close()


def save_feedback_db(request):
    conn = get_connection()
    cursor = conn.cursor()

    print("Updating:", request.original_text)
    print("Status:", request.feedback_type)

    cursor.execute("""
    UPDATE queries_log
    SET feedback_status = ?
    WHERE original_text = ?
    """, (
        request.feedback_type,
        request.original_text
    ))

    print("Rows affected:", cursor.rowcount)

    conn.commit()
    conn.close()

def get_connection():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def save_correction(
    telugu,
    original_en,
    corrected_en,
    original_ta,
    corrected_ta,
    original_ta_rom,
    corrected_ta_rom
):
    print("WRITING TO:", DB_FILE)
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO corrections(
        telugu,
        original_en,
        corrected_en,
        original_ta,
        corrected_ta,
        original_ta_rom,
        corrected_ta_rom
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        telugu,
        original_en,
        corrected_en,
        original_ta,
        corrected_ta,
        original_ta_rom,
        corrected_ta_rom
    ))

    conn.commit()
    conn.close()

def fetch_few_shot_examples(limit=5):
    print("READING FROM:", DB_FILE)
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT *
    FROM corrections
    ORDER BY id DESC
    LIMIT ?
    """, (limit,))

    rows = cursor.fetchall()

    conn.close()

    examples = []

    for row in rows:

        examples.append({
            "telugu": row[1],

            "original_en": row[2],
            "corrected_en": row[3],

            "original_ta": row[4],
            "corrected_ta": row[5],

            "original_ta_rom": row[6],
            "corrected_ta_rom": row[7]
        })

    return examples


def db_init():
    """
    Initializes the SQLite database tables and indexes if they do not exist.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    # 1. General Queries Log Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS queries_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        original_text TEXT NOT NULL,
        input_type TEXT NOT NULL,
        telugu_script TEXT NOT NULL,
        normalized_telugu TEXT NOT NULL,
        dialect TEXT NOT NULL,
        intent TEXT NOT NULL,
        confidence REAL,
        english_translation TEXT,
        tamil_translation TEXT,
        tamil_romanized TEXT,
        feedback_status TEXT DEFAULT 'unrated'
    );
    """)
    
    # 2. Dataset 1: Dialect Normalization Dataset
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dataset_normalization (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dialect_input TEXT UNIQUE NOT NULL,
        standard_telugu TEXT NOT NULL,
        dialect_region TEXT NOT NULL
    );
    """)
    
    # 3. Dataset 2: Travel Intent Dataset
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dataset_intent (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        input_text TEXT UNIQUE NOT NULL,
        predicted_intent TEXT NOT NULL,
        correct_intent TEXT NOT NULL
    );
    """)
    
    # 4. Dataset 3: Translation Dataset
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dataset_translation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telugu_text TEXT UNIQUE NOT NULL,
        english_translation TEXT NOT NULL,
        tamil_translation TEXT NOT NULL,
        tamil_romanized TEXT NOT NULL,
        corrected_english TEXT,
        corrected_tamil TEXT,
        corrected_tamil_romanized TEXT
    );
    """)
    
    # Indexes for optimization
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_queries_text ON queries_log(original_text);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_norm_input ON dataset_normalization(dialect_input);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_intent_input ON dataset_intent(input_text);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_trans_telugu ON dataset_translation(telugu_text);")
    
    conn.commit()
    conn.close()


def detect_feedback_format(text: str) -> str:
    """
    Detects if a user-supplied feedback correction is in:
    1. Tamil Script
    2. Romanized Tamil (English letters sounding like Tamil)
    3. English
    """
    text_strip = text.strip()
    if not text_strip:
        return "English"
        
    # 1. Native Tamil Script Check (Unicode range U+0B80 to U+0BFF)
    if re.search(r"[\u0b80-\u0bff]", text_strip):
        return "Tamil Script"
        
    # 2. Distinguish Romanized Tamil vs English using character counts and keyword lists
    text_lower = text_strip.lower()
    
    english_keywords = {
        'when', 'will', 'arrive', 'where', 'is', 'a', 'good', 'hotel', 'how', 
        'do', 'i', 'go', 'to', 'the', 'shop', 'hospital', 'medicine', 'police', 
        'accident', 'room', 'lodge', 'ticket', 'cost', 'price', 'water', 'food', 
        'eat', 'dining', 'restaurant', 'bus', 'train', 'metro', 'station', 'route'
    }
    
    tamil_roman_keywords = {
        'perunthu', 'eppodhu', 'varum', 'kadaikku', 'eppadi', 'selvathu', 'enge', 
        'irukkirathu', 'nalla', 'oru', 'unavu', 'irayil', 'kovil', 'arai', 
        'vidhuthi', 'vilai', 'thanni', 'sapadu', 'tiffin', 'vazhi', 'eppodu'
    }
    
    # Split text into tokens
    words = set(re.findall(r"\w+", text_lower))
    
    en_matches = len(words.intersection(english_keywords))
    ta_rom_matches = len(words.intersection(tamil_roman_keywords))
    
    # Contextual check for common Romanized Tamil suffixes and words
    rom_tamil_patterns = [
        r'\b(varum|varadhu|irukku|irukkirathu|povadhu|poganum|povali)\b',
        r'\b(perunthu|bus-u|busu|train-u|hotela|hotel-a)\b',
        r'eppodhu|eppodu|eppadi|etla'
    ]
    
    has_rom_patterns = any(re.search(pat, text_lower) for pat in rom_tamil_patterns)
    if has_rom_patterns:
        ta_rom_matches += 2

    if ta_rom_matches > en_matches:
        return "Romanized Tamil"
        
    return "English"


def log_query_db(original_text: str, input_type: str, telugu_script: str, 
                 normalized_telugu: str, dialect: str, intent: str, confidence: float,
                 english: str, tamil: str, tamil_romanized: str) -> int:
    """
    Logs an incoming query transaction.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    cursor.execute("""
    INSERT INTO queries_log (
        timestamp, original_text, input_type, telugu_script, 
        normalized_telugu, dialect, intent, confidence, 
        english_translation, tamil_translation, tamil_romanized, feedback_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unrated')
    """, (
        now, original_text.strip(), input_type, telugu_script.strip(),
        normalized_telugu.strip(), dialect, intent, confidence,
        english.strip(), tamil.strip(), tamil_romanized.strip()
    ))
    
    query_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return query_id


def check_overrides(original_text: str) -> Optional[Dict[str, Any]]:
    """
    Linguistic Override Interception:
    Prioritizes user corrections stored in our database. Returns overridden outputs if matches exist.
    """
    clean_text = original_text.strip()
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Check normalization overrides
    cursor.execute("""
    SELECT standard_telugu, dialect_region FROM dataset_normalization 
    WHERE LOWER(dialect_input) = LOWER(?) LIMIT 1
    """, (clean_text,))
    norm_row = cursor.fetchone()
    
    if not norm_row:
        # If input text matches transliterated standard, search for standard
        conn.close()
        return None
        
    normalized = norm_row["standard_telugu"]
    dialect = norm_row["dialect_region"]
    
    # 2. Check Intent overrides
    cursor.execute("""
    SELECT correct_intent FROM dataset_intent 
    WHERE LOWER(input_text) = LOWER(?) LIMIT 1
    """, (normalized,))
    intent_row = cursor.fetchone()
    intent = intent_row["correct_intent"] if intent_row else None
    
    # 3. Check translation overrides
    cursor.execute("""
    SELECT english_translation, tamil_translation, tamil_romanized, 
           corrected_english, corrected_tamil, corrected_tamil_romanized 
    FROM dataset_translation 
    WHERE LOWER(telugu_text) = LOWER(?) LIMIT 1
    """, (normalized,))
    trans_row = cursor.fetchone()
    
    conn.close()
    
    # Determine fallback or corrected translation values
    en = normalized
    ta = ""
    ta_rom = ""
    
    if trans_row:
        en = trans_row["corrected_english"] or trans_row["english_translation"]
        ta = trans_row["corrected_tamil"] or trans_row["tamil_translation"]
        ta_rom = trans_row["corrected_tamil_romanized"] or trans_row["tamil_romanized"]
    else:
        # Fallback values if translation is not mapped yet
        from services.fallback import translate_fallback
        fallback_trans = translate_fallback(normalized)
        en = fallback_trans["en"]
        ta = fallback_trans["ta"]
        ta_rom = fallback_trans["ta_romanized"]
        
    return {
        "original_input": clean_text,
        "input_type": "Telugu Script" if re.search(r"[\u0c00-\u0c7f]", clean_text) else "Roman Telugu",
        "telugu_script": clean_text if re.search(r"[\u0c00-\u0c7f]", clean_text) else normalized,
        "normalized_telugu": normalized,
        "dialect": dialect,
        "intent": intent or "General Query",
        "confidence": 100.0,
        "intent_distribution": {
            (intent or "General Query"): 1.0
        },
        "en": en,
        "ta": ta,
        "ta_romanized": ta_rom
    }

def fetch_analytics_db() -> Dict[str, Any]:
    """
    Aggregates learning pipeline counts, feedback rates, intent accuracy trends, 
    and translation correction logs for the flagship dashboards.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Dataset Growths
    cursor.execute("SELECT COUNT(*) FROM dataset_normalization")
    count_norm = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM dataset_intent")
    count_intent = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM dataset_translation")
    count_trans = cursor.fetchone()[0]
    
    # 2. General feedback stats
    cursor.execute("SELECT COUNT(*) FROM queries_log")
    total_queries = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM queries_log WHERE feedback_status = 'correct'")
    correct_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM queries_log WHERE feedback_status = 'incorrect'")
    incorrect_count = cursor.fetchone()[0]
    
    rated_count = correct_count + incorrect_count
    accuracy_percentage = 100.0 if rated_count == 0 else (correct_count / rated_count) * 100.0

    # 3. Dialect Coverages
    cursor.execute("""
    SELECT dialect, COUNT(*) as c FROM queries_log 
    WHERE dialect IN ('Telangana', 'Rayalaseema', 'Uttarandhra', 'Standard Telugu')
    GROUP BY dialect
    """)
    dialect_rows = cursor.fetchall()
    dialect_stats = {"Telangana": 0, "Rayalaseema": 0, "Uttarandhra": 0, "Standard Telugu": 0}
    for r in dialect_rows:
        dialect_stats[r["dialect"]] = r["c"]

    # 4. Intent Stats
    cursor.execute("SELECT intent, COUNT(*) as c FROM queries_log GROUP BY intent")
    intent_rows = cursor.fetchall()
    intent_stats = {}
    for r in intent_rows:
        intent_stats[r["intent"]] = r["c"]

    # 5. Intent Accuracy Trend over Time (Daily, Weekly, Monthly)
    # Let's aggregate logs based on timestamp formatting
    # Daily trend (last 7 days)
    cursor.execute("""
    SELECT date(timestamp) as d, 
           SUM(CASE WHEN feedback_status = 'correct' THEN 1 ELSE 0 END) as correct,
           SUM(CASE WHEN feedback_status IN ('correct', 'incorrect') THEN 1 ELSE 0 END) as total
    FROM queries_log 
    WHERE timestamp IS NOT NULL AND feedback_status IN ('correct', 'incorrect')
    GROUP BY d ORDER BY d DESC LIMIT 10
    """)
    daily_rows = cursor.fetchall()
    daily_history = []
    for r in reversed(daily_rows):
        pct = 100.0 if r["total"] == 0 else (r["correct"] / r["total"]) * 100.0
        daily_history.append({"date": r["d"], "accuracy": round(pct, 1), "total_rated": r["total"]})
        
    # Default placeholder date if empty
    if not daily_history:
        daily_history.append({"date": datetime.date.today().isoformat(), "accuracy": 100.0, "total_rated": 0})

    # Weekly trend
    cursor.execute("""
    SELECT strftime('%Y-W%W', timestamp) as w, 
           SUM(CASE WHEN feedback_status = 'correct' THEN 1 ELSE 0 END) as correct,
           SUM(CASE WHEN feedback_status IN ('correct', 'incorrect') THEN 1 ELSE 0 END) as total
    FROM queries_log 
    WHERE timestamp IS NOT NULL AND feedback_status IN ('correct', 'incorrect')
    GROUP BY w ORDER BY w DESC LIMIT 5
    """)
    weekly_rows = cursor.fetchall()
    weekly_history = []
    for r in reversed(weekly_rows):
        pct = 100.0 if r["total"] == 0 else (r["correct"] / r["total"]) * 100.0
        weekly_history.append({"date": r["w"], "accuracy": round(pct, 1), "total_rated": r["total"]})
        
    if not weekly_history:
        weekly_history.append({"date": "Week A", "accuracy": 100.0, "total_rated": 0})

    # Monthly trend
    cursor.execute("""
    SELECT strftime('%Y-%m', timestamp) as m, 
           SUM(CASE WHEN feedback_status = 'correct' THEN 1 ELSE 0 END) as correct,
           SUM(CASE WHEN feedback_status IN ('correct', 'incorrect') THEN 1 ELSE 0 END) as total
    FROM queries_log 
    WHERE timestamp IS NOT NULL AND feedback_status IN ('correct', 'incorrect')
    GROUP BY m ORDER BY m DESC LIMIT 6
    """)
    monthly_rows = cursor.fetchall()
    monthly_history = []
    for r in reversed(monthly_rows):
        pct = 100.0 if r["total"] == 0 else (r["correct"] / r["total"]) * 100.0
        monthly_history.append({"date": r["m"], "accuracy": round(pct, 1), "total_rated": r["total"]})
        
    if not monthly_history:
        monthly_history.append({"date": "Month A", "accuracy": 100.0, "total_rated": 0})

    # 6. Translation Corrections received
    cursor.execute("SELECT COUNT(*) FROM dataset_translation WHERE corrected_english IS NOT NULL OR corrected_tamil IS NOT NULL")
    corrections_received = cursor.fetchone()[0]
    
    # Translation acceptance rate = (Rated Queries - Corrections Received) / Rated Queries
    acceptance_rate = 100.0
    if rated_count > 0:
        acceptance_rate = ((rated_count - incorrect_count) / rated_count) * 100.0

    # Most corrected phrases table
    cursor.execute("""
    SELECT telugu_text, english_translation, corrected_english, tamil_translation, corrected_tamil 
    FROM dataset_translation 
    WHERE corrected_english IS NOT NULL OR corrected_tamil IS NOT NULL 
    LIMIT 10
    """)
    corrected_rows = cursor.fetchall()
    corrected_phrases = []
    for r in corrected_rows:
        corrected_phrases.append({
            "original_telugu": r["telugu_text"],
            "predicted_en": r["english_translation"],
            "corrected_en": r["corrected_english"] or r["english_translation"],
            "predicted_ta": r["tamil_translation"],
            "corrected_ta": r["corrected_tamil"] or r["tamil_translation"]
        })

    # 7. Common queries
    cursor.execute("""
    SELECT original_text, COUNT(*) as c, dialect, intent FROM queries_log 
    GROUP BY original_text ORDER BY c DESC LIMIT 10
    """)
    common_rows = cursor.fetchall()
    common_queries = []
    for r in common_rows:
        common_queries.append({
            "text": r["original_text"],
            "count": r["c"],
            "dialect": r["dialect"],
            "intent": r["intent"]
        })

    conn.close()

    return {
    "total_queries": total_queries,

    "dataset_growths": {
        "normalization_examples": count_norm,
        "intent_examples": count_intent,
        "translation_examples": count_trans
    },

    "feedback_statistics": {
        "correct_count": correct_count,
        "incorrect_count": incorrect_count,
        "rated_count": rated_count,
        "accuracy_percentage": round(accuracy_percentage, 1),
        "acceptance_rate": round(acceptance_rate, 1),
        "corrections_received": corrections_received
    },

    "dialect_statistics": dialect_stats,

    "intent_statistics": intent_stats,

    "accuracy_trends": {
        "daily": daily_history,
        "weekly": weekly_history,
        "monthly": monthly_history
    },

    "translation_metrics": {
        "most_corrected_phrases": corrected_phrases
    },

    "most_common_queries": common_queries
}